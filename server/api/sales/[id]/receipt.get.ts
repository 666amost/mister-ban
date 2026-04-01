import { createError, getQuery, setHeader } from "h3";
import { z } from "zod";
import { getPool } from "../../../db/pool";
import { requireUser } from "../../../modules/auth/session";
import { resolveStoreId } from "../../../modules/store/store-context";
import { getSaleDetail } from "../../../modules/sales/sales.service";
import { getStoreById } from "../../../modules/stores/stores.repo";

const paramsSchema = z.object({ id: z.string().uuid() });
const paperPresetSchema = z.enum(["57-roll", "58-continuous"]);

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function rupiah(value: number) {
  return value.toLocaleString("id-ID");
}

function qty(value: number) {
  // Avoid printing "1.0" style quantities while still supporting fractional qty if ever needed.
  return Number.isInteger(value) ? String(value) : value.toLocaleString("id-ID");
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function productDisplayName(brand: string, name: string) {
  const brandTrimmed = brand.trim();
  const nameTrimmed = name.trim();

  if (!brandTrimmed) return nameTrimmed;
  if (!nameTrimmed) return brandTrimmed;

  const brandNormalized = normalizeText(brandTrimmed);
  const nameNormalized = normalizeText(nameTrimmed);
  if (nameNormalized === brandNormalized || nameNormalized.startsWith(`${brandNormalized} `)) {
    return nameTrimmed;
  }

  return `${brandTrimmed} ${nameTrimmed}`.replace(/\s+/g, " ").trim();
}

function productReceiptName(brand: string, name: string, size: string) {
  const base = productDisplayName(brand, name);
  const sizeTrimmed = size.trim();
  if (!sizeTrimmed) return base;
  const baseNormalized = normalizeText(base);
  const sizeNormalized = normalizeText(sizeTrimmed);
  if (sizeNormalized && baseNormalized.includes(sizeNormalized)) return base;
  return `${base} ${sizeTrimmed}`.replace(/\s+/g, " ").trim();
}

function storeInstagram(storeName: string, city: string, address: string) {
  const source = normalizeText(`${storeName} ${city} ${address}`);

  if (source.includes("kedoya")) return "@dunia_ban_kedoya";
  if (source.includes("meruya") || source.includes("karang tengah")) return "@misterbanmotor";
  if (source.includes("gondrong")) return "@m2tc.misterban.gondrong";
  if (source.includes("paninggilan")) return "@m2tc.gemilangban.paninggilan";
  if (source.includes("ciledug")) return "@m2tc.gemilangban.ciledugindah";
  if (source.includes("kembangan")) return "@dunia_ban_kembangan";

  return "";
}

function formatSaleDate(value: unknown) {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return formatter.format(value);
  }

  if (typeof value === "string") {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;

    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) return formatter.format(parsed);
  }

  return String(value);
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const storeId = resolveStoreId(event, user);
  const params = paramsSchema.safeParse(event.context.params);
  if (!params.success)
    throw createError({ statusCode: 400, statusMessage: "Invalid params" });

  const detail = await getSaleDetail({
    db: getPool(),
    storeId,
    saleId: params.data.id,
  });
  if (!detail)
    throw createError({ statusCode: 404, statusMessage: "Sale not found" });

  const store = await getStoreById(getPool(), storeId);
  const storeName = store?.name?.trim() || "Mister Ban";
  const storeCity = store?.city?.trim() || "";
  const storeAddress = store?.address?.trim() || "";
  const storeLines = [store?.address?.trim(), store?.city?.trim()]
    .filter((v): v is string => Boolean(v && v.length > 0))
    .filter((v, i, arr) => arr.indexOf(v) === i);
  const storeLinesHtml = storeLines.length
    ? storeLines
        .map((l) => `<div class="storeLine">${escapeHtml(l)}</div>`)
        .join("")
    : "";
  const saleId = params.data.id;
  const query = getQuery(event);
  const paperPreset = paperPresetSchema.safeParse(query.paper).success
    ? paperPresetSchema.parse(query.paper)
    : "57-roll";

  setHeader(event, "content-type", "text/html; charset=utf-8");

  type ReceiptItem = {
    sku: string;
    brand: string;
    name: string;
    size: string;
    qty: number;
    sell_price: number;
    line_total: number;
  };

  type CustomItem = {
    item_name: string;
    qty: number;
    price: number;
    line_total: number;
  };

  type PaymentRow = {
    payment_type: string;
    amount: number;
  };

  const items = detail.items as ReceiptItem[];
  const customItems = (detail.customItems ?? []) as CustomItem[];
  const discount = (detail.sale.discount ?? 0) as number;
  const payments = (detail.payments ?? []) as PaymentRow[];

  const itemsHtml = items
    .map((i) => {
      const itemName = escapeHtml(productReceiptName(i.brand, i.name, i.size));
      return `
        <tr>
          <td class="name">
            <div class="desc">${itemName}</div>
          </td>
          <td class="qty">${qty(i.qty)}</td>
          <td class="price">${rupiah(i.sell_price)}</td>
          <td class="total">${rupiah(i.line_total)}</td>
        </tr>
      `;
    })
    .join("");

  const customItemsHtml = customItems
    .map(
      (ci) => `
        <tr>
          <td class="name">
            <div class="desc">${escapeHtml(ci.item_name)}</div>
          </td>
          <td class="qty">${qty(ci.qty)}</td>
          <td class="price">${rupiah(ci.price)}</td>
          <td class="total">${rupiah(ci.line_total)}</td>
        </tr>
      `,
    )
    .join("");

  const adjustmentsHtml = discount > 0 ? `<div class="adjustment discount"><span>Diskon</span><span>- ${rupiah(discount)}</span></div>` : "";
  const paymentsHtml =
    payments.length > 1
      ? `<div>Pembayaran:</div>${payments
          .map(
            (p) =>
              `<div>${escapeHtml(String(p.payment_type))}: ${rupiah(p.amount)}</div>`,
          )
          .join("")}`
      : `<div>Pembayaran: ${escapeHtml(String(payments[0]?.payment_type ?? detail.sale.payment_type))}</div>`;
  const instagram = storeInstagram(storeName, storeCity, storeAddress);
  const instagramHtml = instagram ? `<div>IG: ${escapeHtml(instagram)}</div>` : "";
  const paperPresetMap = {
    "57-roll": {
      pageWidth: "57mm",
      contentWidth: "49mm",
    },
    "58-continuous": {
      pageWidth: "58mm",
      contentWidth: "50mm",
    },
  } as const;
  const activePaperPreset = paperPresetMap[paperPreset];

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Struk</title>
        <style id="page-size-style">
          @page {
            size: ${activePaperPreset.pageWidth} auto;
            margin: 0;
          }
        </style>
        <style>
          :root {
            --paper-width: ${activePaperPreset.pageWidth};
            --content-width: ${activePaperPreset.contentWidth};
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ececec;
            color: #000;
            font-family: "Courier New", Courier, monospace;
            font-variant-numeric: tabular-nums;
          }
          body {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            padding: 12px 0 20px;
          }
          .sheet {
            width: var(--paper-width);
            background: #fff;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
          }
          .wrap {
            width: var(--content-width);
            margin: 0 auto;
            padding: 3mm 0 4mm;
          }
          h1 {
            font-size: 15px;
            line-height: 1.2;
            margin: 0 0 4px;
            text-align: center;
          }
          .storeLine {
            font-size: 10px;
            text-align: center;
            line-height: 1.25;
          }
          .storeLine + .storeLine {
            margin-top: 1px;
          }
          .meta {
            margin-top: 6px;
            margin-bottom: 8px;
            font-size: 10px;
            line-height: 1.35;
          }
          .meta div + div {
            margin-top: 1px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 10px;
          }
          th, td {
            padding: 3px 0;
            vertical-align: top;
          }
          th {
            text-align: left;
            border-bottom: 1px dashed #000;
            font-weight: 700;
          }
          th:not(:first-child), td:not(:first-child) {
            padding-left: 4px;
          }
          th.qty, th.price, th.total,
          td.qty, td.price, td.total {
            text-align: right;
            white-space: nowrap;
          }
          th.qty, td.qty {
            width: 3ch;
          }
          th.price, td.price,
          th.total, td.total {
            width: 8ch;
          }
          td.name {
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          .desc {
            font-weight: 700;
            line-height: 1.25;
          }
          .adjustment {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-top: 4px;
            font-size: 10px;
          }
          .adjustment.discount {
            color: #b42318;
          }
          .sum {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-top: 6px;
            padding-top: 6px;
            border-top: 1px dashed #000;
            font-size: 11px;
            font-weight: 700;
          }
          .footer {
            margin-top: 10px;
            font-size: 10px;
            text-align: center;
            line-height: 1.45;
          }
          .actions {
            margin-top: 12px;
            display: flex;
            justify-content: center;
          }
          .printAction {
            min-width: 120px;
            height: 38px;
            border: none;
            border-radius: 999px;
            background: #111;
            color: #fff;
            font: inherit;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
          }
          @media print {
            html, body {
              background: #fff;
            }
            body {
              display: block;
              min-height: auto;
              padding: 0;
            }
            .sheet {
              width: var(--paper-width);
              box-shadow: none;
            }
            .wrap {
              width: var(--content-width);
              padding: 2.5mm 0 3mm;
            }
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="wrap">
            <h1>${escapeHtml(storeName)}</h1>
            ${storeLinesHtml}
            <div class="meta">
              <div>Tanggal: ${escapeHtml(formatSaleDate(detail.sale.sale_date))}</div>
              <div>Plat: ${escapeHtml(String(detail.sale.customer_plate_no))}</div>
              ${paymentsHtml}
            </div>
            <table>
              <thead>
                <tr>
                  <th class="item">Item</th>
                  <th class="qty">Qty</th>
                  <th class="price">Harga</th>
                  <th class="total">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                ${customItemsHtml}
              </tbody>
            </table>
            ${adjustmentsHtml}
            <div class="sum">
              <div>Total</div>
              <div>${rupiah(detail.sale.total)}</div>
            </div>
            <div class="footer">
              <div>Terima kasih</div>
              <div>Barang yang sudah dibeli tidak dapat dikembalikan</div>
              ${instagramHtml}
            </div>
            <div class="actions no-print">
              <button class="printAction" onclick="mbPrint()">Cetak</button>
            </div>
          </div>
        </div>
        <script>
          async function mbPrint() {
            try {
              await fetch(${JSON.stringify(`/api/sales/${saleId}/printed`)}, { method: "POST" });
            } catch {}
            window.print();
          }
        </script>
      </body>
    </html>
  `;
});
