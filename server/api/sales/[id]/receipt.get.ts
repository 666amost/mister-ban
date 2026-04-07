import { createError, getHeader, getQuery, setHeader } from "h3";
import { z } from "zod";
import { getPool } from "../../../db/pool";
import { requireUser } from "../../../modules/auth/session";
import { resolveStoreId } from "../../../modules/store/store-context";
import { getSaleDetail } from "../../../modules/sales/sales.service";
import { getStoreById } from "../../../modules/stores/stores.repo";

const paramsSchema = z.object({ id: z.string().uuid() });
const paperPresetSchema = z.enum(["57-roll", "58-continuous"]);
const renderModeSchema = z.enum(["html", "plain"]);

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

function wrapReceiptText(value: string, width: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return [""];

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  const pushChunkedWord = (word: string) => {
    let remaining = word;
    while (remaining.length > width) {
      lines.push(remaining.slice(0, width));
      remaining = remaining.slice(width);
    }
    current = remaining;
  };

  for (const word of words) {
    if (!word) continue;

    if (word.length > width) {
      if (current) {
        lines.push(current);
        current = "";
      }
      pushChunkedWord(word);
      continue;
    }

    if (!current) {
      current = word;
      continue;
    }

    const next = `${current} ${word}`;
    if (next.length <= width) {
      current = next;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
}

function centerReceiptText(value: string, width: number) {
  return wrapReceiptText(value, width).map((line) => {
    const leftPad = Math.max(0, Math.floor((width - line.length) / 2));
    return `${" ".repeat(leftPad)}${line}`;
  });
}

function padReceiptRight(value: string, width: number) {
  if (value.length >= width) return value.slice(0, width);
  return `${value}${" ".repeat(width - value.length)}`;
}

function alignReceiptPair(left: string, right: string, width: number) {
  if (!right) return left;
  if (left.length + right.length >= width) return `${left} ${right}`;
  return `${left}${" ".repeat(width - left.length - right.length)}${right}`;
}

function buildPlainReceiptItemLines(name: string, qtyValue: string, totalValue: string, width: number) {
  const qtyWidth = 3;
  const totalWidth = 8;
  const nameWidth = width - qtyWidth - totalWidth - 2;
  const wrappedName = wrapReceiptText(name, nameWidth);

  return wrappedName.map((line, index) => {
    const qtyCell = index === 0 ? qtyValue.padStart(qtyWidth, " ") : " ".repeat(qtyWidth);
    const totalCell = index === 0 ? totalValue.padStart(totalWidth, " ") : " ".repeat(totalWidth);
    return `${padReceiptRight(line, nameWidth)} ${qtyCell} ${totalCell}`;
  });
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
  const userAgent = getHeader(event, "user-agent") ?? "";
  const renderMode = renderModeSchema.safeParse(query.render).success
    ? renderModeSchema.parse(query.render)
    : /android/i.test(userAgent)
      ? "plain"
      : "html";

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

  const paperPresetMap = {
    "57-roll": {
      pageWidth: "57mm",
      contentWidth: "44mm",
    },
    "58-continuous": {
      pageWidth: "58mm",
      contentWidth: "50mm",
    },
  } as const;
  const activePaperPreset = paperPresetMap[paperPreset];
  const isNarrow = paperPreset === "57-roll";

  const itemsHtml = items
    .map((i) => {
      const itemName = escapeHtml(productReceiptName(i.brand, i.name, i.size));
      if (isNarrow) {
        return `
        <tr>
          <td class="name">
            <div class="desc">${itemName}</div>
            <div class="unit-price">${rupiah(i.sell_price)}</div>
          </td>
          <td class="qty">${qty(i.qty)}</td>
          <td class="total">${rupiah(i.line_total)}</td>
        </tr>
      `;
      }
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
    .map((ci) => {
      if (isNarrow) {
        return `
        <tr>
          <td class="name">
            <div class="desc">${escapeHtml(ci.item_name)}</div>
            <div class="unit-price">${rupiah(ci.price)}</div>
          </td>
          <td class="qty">${qty(ci.qty)}</td>
          <td class="total">${rupiah(ci.line_total)}</td>
        </tr>
      `;
      }
      return `
        <tr>
          <td class="name">
            <div class="desc">${escapeHtml(ci.item_name)}</div>
          </td>
          <td class="qty">${qty(ci.qty)}</td>
          <td class="price">${rupiah(ci.price)}</td>
          <td class="total">${rupiah(ci.line_total)}</td>
        </tr>
      `;
    })
    .join("");

  const tableHeaderHtml = isNarrow
    ? `<tr><th class="item">Item</th><th class="qty">Qty</th><th class="total">Total</th></tr>`
    : `<tr><th class="item">Item</th><th class="qty">Qty</th><th class="price">Harga</th><th class="total">Total</th></tr>`;

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

  const plainContentWidth = paperPreset === "57-roll" ? "40mm" : "46mm";
  const plainScreenPaperWidth = paperPreset === "57-roll"
    ? "min(calc(100vw - 24px), 280px)"
    : "min(calc(100vw - 24px), 320px)";
  const plainScreenContentWidth = paperPreset === "57-roll"
    ? "min(calc(100vw - 52px), 236px)"
    : "min(calc(100vw - 52px), 272px)";
  const plainReceiptWidth = paperPreset === "57-roll" ? 30 : 34;
  const plainQtyWidth = 3;
  const plainTotalWidth = 8;
  const plainNameWidth = plainReceiptWidth - plainQtyWidth - plainTotalWidth - 2;
  const plainLines = [
    ...centerReceiptText(storeName, plainReceiptWidth),
    ...storeLines.flatMap((line) => centerReceiptText(line, plainReceiptWidth)),
    "",
    ...wrapReceiptText(`Tanggal: ${formatSaleDate(detail.sale.sale_date)}`, plainReceiptWidth),
    ...wrapReceiptText(`Plat: ${String(detail.sale.customer_plate_no)}`, plainReceiptWidth),
    ...(payments.length > 1
      ? ["Pembayaran:", ...payments.map((payment) => alignReceiptPair(String(payment.payment_type), rupiah(payment.amount), plainReceiptWidth))]
      : wrapReceiptText(`Pembayaran: ${String(payments[0]?.payment_type ?? detail.sale.payment_type)}`, plainReceiptWidth)),
    "",
    `${padReceiptRight("Item", plainNameWidth)} ${"Qty".padStart(plainQtyWidth, " ")} ${"Total".padStart(plainTotalWidth, " ")}`,
    "-".repeat(plainReceiptWidth),
    ...items.flatMap((item) => [
      ...buildPlainReceiptItemLines(productReceiptName(item.brand, item.name, item.size), qty(item.qty), rupiah(item.line_total), plainReceiptWidth),
      ...wrapReceiptText(rupiah(item.sell_price), plainNameWidth).map((line) => `  ${line}`),
      "",
    ]),
    ...customItems.flatMap((item) => [
      ...buildPlainReceiptItemLines(item.item_name, qty(item.qty), rupiah(item.line_total), plainReceiptWidth),
      ...wrapReceiptText(rupiah(item.price), plainNameWidth).map((line) => `  ${line}`),
      "",
    ]),
    ...(discount > 0 ? [alignReceiptPair("Diskon", `- ${rupiah(discount)}`, plainReceiptWidth)] : []),
    "-".repeat(plainReceiptWidth),
    alignReceiptPair("Total", rupiah(detail.sale.total), plainReceiptWidth),
    "",
    ...centerReceiptText("Terima kasih", plainReceiptWidth),
    ...centerReceiptText("Barang yang sudah dibeli tidak dapat dikembalikan", plainReceiptWidth),
    ...(instagram ? centerReceiptText(`IG: ${instagram}`, plainReceiptWidth) : []),
  ];
  const plainReceiptText = plainLines.join("\n").replace(/\n{3,}/g, "\n\n");

  if (renderMode === "plain") {
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
              --content-width: ${plainContentWidth};
              --screen-paper-width: ${plainScreenPaperWidth};
              --screen-content-width: ${plainScreenContentWidth};
            }
            html, body {
              width: 100%;
              margin: 0;
              padding: 0;
              background: #ececec;
              color: #000;
              font-family: ui-monospace, "Roboto Mono", "Noto Sans Mono", "DejaVu Sans Mono", monospace;
              font-variant-numeric: tabular-nums;
              overflow-x: hidden;
            }
            body {
              min-height: 100vh;
              display: flex;
              justify-content: center;
              padding: 12px 12px 20px;
              box-sizing: border-box;
            }
            .sheet {
              width: var(--screen-paper-width);
              max-width: calc(100vw - 24px);
              background: #fff;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
            }
            .wrap {
              width: var(--screen-content-width);
              max-width: 100%;
              margin: 0 auto;
              box-sizing: border-box;
              padding: 12px 8px 16px;
              display: flex;
              flex-direction: column;
              align-items: center;
              overflow-x: auto;
            }
            .plainReceipt {
              margin: 0;
              white-space: pre;
              font-family: "Courier New", Courier, monospace;
              font-size: 10px;
              line-height: 1.3;
              font-weight: 700;
              letter-spacing: 0;
              color: #000;
              width: 100%;
              max-width: 100%;
            }
            @media screen {
              .plainReceipt {
                font-size: 9px;
                line-height: 1.28;
                width: max-content;
                max-width: none;
              }
            }
            .actions {
              margin-top: 12px;
              display: flex;
              justify-content: center;
              width: 100%;
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
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                color-adjust: exact;
                font-family: ui-monospace, "Roboto Mono", "Noto Sans Mono", "DejaVu Sans Mono", monospace;
              }
              * {
                -webkit-font-smoothing: none;
                -moz-osx-font-smoothing: unset;
                font-smooth: never;
                text-rendering: optimizeSpeed;
                color: #000 !important;
                border-color: #000 !important;
                box-shadow: none !important;
                opacity: 1 !important;
              }
              .plainReceipt {
                font-weight: 700;
                -webkit-text-stroke: 0.15px #000;
                font-size: 10px;
                line-height: 1.3;
                width: 100%;
                max-width: 100%;
              }
              body {
                display: block;
                min-height: auto;
                padding: 0;
              }
              .sheet {
                width: var(--paper-width);
                max-width: none;
                box-shadow: none;
              }
              .wrap {
                width: var(--content-width);
                max-width: none;
                box-sizing: border-box;
                display: block;
                padding: 2.5mm 1mm 3mm;
                overflow: visible;
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
              <pre class="plainReceipt">${escapeHtml(plainReceiptText)}</pre>
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
  }

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
            font-family: ui-monospace, "Roboto Mono", "Noto Sans Mono", "DejaVu Sans Mono", monospace;
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
            font-size: 11px;
            text-align: center;
            line-height: 1.3;
            color: #000;
          }
          .storeLine + .storeLine {
            margin-top: 1px;
          }
          .meta {
            margin-top: 6px;
            margin-bottom: 8px;
            font-size: 11px;
            line-height: 1.3;
            color: #000;
          }
          .meta div + div {
            margin-top: 1px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 11px;
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
            font-weight: 600;
            line-height: 1.25;
            color: #000;
          }
          .unit-price {
            font-size: 10px;
            color: #000;
            line-height: 1.2;
            margin-top: 1px;
          }
          .adjustment {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-top: 4px;
            font-size: 11px;
            color: #000;
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
            font-size: 11px;
            text-align: center;
            line-height: 1.35;
            color: #000;
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
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              color-adjust: exact;
            }
            * {
              -webkit-font-smoothing: none;
              -moz-osx-font-smoothing: unset;
              font-smooth: never;
              text-rendering: optimizeSpeed;
              color: #000 !important;
              border-color: #000 !important;
              box-shadow: none !important;
              opacity: 1 !important;
            }
            html, body {
              font-family: ui-monospace, "Roboto Mono", "Noto Sans Mono", "DejaVu Sans Mono", monospace;
            }
            .storeLine,
            h1,
            .meta,
            table,
            th,
            td,
            .desc,
            .sum,
            .unit-price,
            .adjustment,
            .footer {
              font-weight: 700;
              -webkit-text-stroke: 0.15px #000;
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
                ${tableHeaderHtml}
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
