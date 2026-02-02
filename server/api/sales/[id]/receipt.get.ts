import { createError, setHeader } from "h3";
import { z } from "zod";
import { getPool } from "../../../db/pool";
import { requireUser } from "../../../modules/auth/session";
import { resolveStoreId } from "../../../modules/store/store-context";
import { getSaleDetail } from "../../../modules/sales/sales.service";
import { getStoreById } from "../../../modules/stores/stores.repo";

const paramsSchema = z.object({ id: z.string().uuid() });

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
  const storeLines = [store?.address?.trim(), store?.city?.trim()]
    .filter((v): v is string => Boolean(v && v.length > 0))
    .filter((v, i, arr) => arr.indexOf(v) === i);
  const storeLinesHtml = storeLines.length
    ? storeLines
        .map((l) => `<div class="storeLine">${escapeHtml(l)}</div>`)
        .join("")
    : "";
  const saleId = params.data.id;

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

  const items = detail.items as ReceiptItem[];
  const customItems = (detail.customItems ?? []) as CustomItem[];
  const discount = (detail.sale.discount ?? 0) as number;

  const itemsHtml = items
    .map(
      (i) => `
        <tr>
          <td class="name">
            <div class="sku">${escapeHtml(i.sku)}</div>
            <div class="desc">${escapeHtml(`${i.brand} ${i.name} ${i.size}`)}</div>
          </td>
          <td class="qty">${qty(i.qty)}</td>
          <td class="price">${rupiah(i.sell_price)}</td>
          <td class="total">${rupiah(i.line_total)}</td>
        </tr>
      `,
    )
    .join("");

  const customItemsHtml = customItems
    .map(
      (ci) => `
        <tr>
          <td class="name">
            <div class="sku">${escapeHtml(ci.item_name)}</div>
            <div class="desc">Custom</div>
          </td>
          <td class="qty">${qty(ci.qty)}</td>
          <td class="price">${rupiah(ci.price)}</td>
          <td class="total">${rupiah(ci.line_total)}</td>
        </tr>
      `,
    )
    .join("");

  const adjustmentsHtml = discount > 0 ? `<div class="adjustment discount"><span>Diskon</span><span>- ${rupiah(discount)}</span></div>` : "";

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Struk</title>
        <style>
          :root { --w: 80mm; }
          body { width: var(--w); margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-variant-numeric: tabular-nums; }
          .wrap { padding: 10px; }
          h1 { font-size: 16px; margin: 0 0 6px; text-align: center; }
          .storeLine { font-size: 11px; text-align: center; line-height: 1.25; opacity: 0.85; }
          .storeLine + .storeLine { margin-top: 2px; }
          .meta { font-size: 12px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed; }
          th, td { padding: 4px 0; vertical-align: top; }
          th { text-align: left; border-bottom: 1px dashed #000; font-weight: 700; }
          th:not(:first-child), td:not(:first-child) { padding-left: 8px; }
          th.qty, th.price, th.total,
          td.qty, td.price, td.total { text-align: right; white-space: nowrap; }
          th.qty, td.qty { width: 4ch; }
          th.price, td.price { width: 10ch; }
          th.total, td.total { width: 10ch; }
          td.name { overflow-wrap: anywhere; word-break: break-word; }
          .sku { font-weight: 700; }
          .desc { opacity: 0.85; }
          .sum { border-top: 1px dashed #000; margin-top: 6px; padding-top: 6px; display: flex; justify-content: space-between; font-size: 12px; }
          .adjustment { display: flex; justify-content: space-between; font-size: 11px; margin-top: 4px; }
          .adjustment.discount { color: #c00; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h1>${escapeHtml(storeName)}</h1>
          ${storeLinesHtml}
          <div class="meta">
            <div>Tanggal: ${escapeHtml(formatSaleDate(detail.sale.sale_date))}</div>
            <div>Plat: ${escapeHtml(String(detail.sale.customer_plate_no))}</div>
            <div>Pembayaran: ${escapeHtml(String(detail.sale.payment_type))}</div>
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
          <div class="no-print" style="margin-top:10px">
            <button onclick="mbPrint()">Cetak</button>
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
