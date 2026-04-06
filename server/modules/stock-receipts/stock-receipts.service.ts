import { createError } from "h3";
import { getPool } from "../../db/pool";
import { tx } from "../../db/db";
import { badRequest } from "../../utils/http";
import { buildValuesPlaceholders } from "../../utils/sql";

export type StockReceiptItemInput = {
  item_name: string;
  qty: number;
  unit_label: string;
};

export type StockReceiptItemRow = {
  item_name: string;
  qty: number;
  unit_label: string;
};

export type StockReceiptRow = {
  id: string;
  receipt_date: string;
  created_at: string;
  total_qty: number;
  entry_count: number;
  items: StockReceiptItemRow[];
};

export type MonthlyStockReceiptItem = {
  item_name: string;
  qty: number;
  unit_label: string;
};

export type MonthlyStockReceiptDay = {
  receipt_date: string;
  total_qty: number;
  receipt_count: number;
  items: MonthlyStockReceiptItem[];
};

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeUnitLabel(value: string) {
  const unit = normalizeWhitespace(value).toLowerCase();
  if (!unit) return "pcs";
  if (["pc", "pcs", "piece", "pieces"].includes(unit)) return "pcs";
  return unit;
}

function normalizeItems(items: StockReceiptItemInput[]) {
  const grouped = new Map<string, StockReceiptItemInput>();

  for (const item of items) {
    const itemName = normalizeWhitespace(item.item_name);
    const unitLabel = normalizeUnitLabel(item.unit_label);
    if (!itemName) continue;

    const key = `${itemName.toLowerCase()}::${unitLabel}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.qty += item.qty;
      continue;
    }

    grouped.set(key, {
      item_name: itemName,
      qty: item.qty,
      unit_label: unitLabel,
    });
  }

  return Array.from(grouped.values());
}

export async function createStockReceipt({
  storeId,
  userId,
  receiptDate,
  items,
}: {
  storeId: string;
  userId: string;
  receiptDate: string;
  items: StockReceiptItemInput[];
}) {
  const normalizedItems = normalizeItems(items);
  if (normalizedItems.length === 0) {
    throw badRequest("Minimal 1 item barang masuk");
  }

  return await tx(async (client) => {
    const receiptRes = await client.query<{ id: string }>(
      `
        INSERT INTO stock_receipts (store_id, receipt_date, created_by)
        VALUES ($1, $2::date, $3)
        RETURNING id
      `,
      [storeId, receiptDate, userId],
    );

    const receiptId = receiptRes.rows[0]?.id;
    if (!receiptId) throw badRequest("Gagal membuat barang masuk");

    const itemRows = normalizedItems.map((item) => [
      receiptId,
      item.item_name,
      item.qty,
      item.unit_label,
    ]);
    const values = buildValuesPlaceholders(itemRows);

    await client.query(
      `
        INSERT INTO stock_receipt_items (stock_receipt_id, item_name, qty, unit_label)
        VALUES ${values.placeholders}
      `,
      values.values,
    );

    return { receipt_id: receiptId };
  });
}

export async function listStockReceipts({
  storeId,
  date,
  allDates,
  q,
  limit,
  offset,
}: {
  storeId: string;
  date: string;
  allDates: boolean;
  q?: string;
  limit: number;
  offset: number;
}) {
  const { rows } = await getPool().query<StockReceiptRow>(
    `
      SELECT
        sr.id,
        sr.receipt_date::text AS receipt_date,
        sr.created_at,
        COALESCE(SUM(sri.qty), 0)::int AS total_qty,
        COUNT(sri.id)::int AS entry_count,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'item_name', sri.item_name,
              'qty', sri.qty,
              'unit_label', sri.unit_label
            )
            ORDER BY sri.created_at, sri.id
          ) FILTER (WHERE sri.id IS NOT NULL),
          '[]'::json
        ) AS items
      FROM stock_receipts sr
      LEFT JOIN stock_receipt_items sri ON sri.stock_receipt_id = sr.id
      WHERE sr.store_id = $1
        AND ($2::boolean OR sr.receipt_date = $3::date)
        AND (
          $4::text IS NULL
          OR EXISTS (
            SELECT 1
            FROM stock_receipt_items sri2
            WHERE sri2.stock_receipt_id = sr.id
              AND LOWER(sri2.item_name) LIKE '%' || LOWER($4) || '%'
          )
        )
      GROUP BY sr.id
      ORDER BY sr.receipt_date DESC, sr.created_at DESC
      LIMIT $5
      OFFSET $6
    `,
    [storeId, allDates, date, q ?? null, limit, offset],
  );

  return rows;
}

export async function deleteStockReceipt({
  storeId,
  receiptId,
}: {
  storeId: string;
  receiptId: string;
}) {
  const result = await getPool().query(
    `
      DELETE FROM stock_receipts
      WHERE id = $1 AND store_id = $2
    `,
    [receiptId, storeId],
  );

  if ((result.rowCount ?? 0) < 1) {
    throw createError({ statusCode: 404, statusMessage: "Barang masuk tidak ditemukan" });
  }
}

export async function getMonthlyStockReceiptSummary({
  storeId,
  start,
  end,
}: {
  storeId: string;
  start: string;
  end: string;
}) {
  const db = getPool();

  const [dailyRes, itemRes] = await Promise.all([
    db.query<{
      receipt_date: string;
      receipt_count: number;
      total_qty: number;
    }>(
      `
        SELECT
          sr.receipt_date::text AS receipt_date,
          COUNT(*)::int AS receipt_count,
          COALESCE(SUM(item_totals.total_qty), 0)::int AS total_qty
        FROM stock_receipts sr
        LEFT JOIN (
          SELECT stock_receipt_id, COALESCE(SUM(qty), 0)::int AS total_qty
          FROM stock_receipt_items
          GROUP BY stock_receipt_id
        ) item_totals ON item_totals.stock_receipt_id = sr.id
        WHERE sr.store_id = $1
          AND sr.receipt_date >= $2::date
          AND sr.receipt_date < $3::date
        GROUP BY sr.receipt_date
        ORDER BY sr.receipt_date
      `,
      [storeId, start, end],
    ),
    db.query<MonthlyStockReceiptItem & { receipt_date: string }>(
      `
        SELECT
          sr.receipt_date::text AS receipt_date,
          MIN(TRIM(sri.item_name)) AS item_name,
          MIN(TRIM(sri.unit_label)) AS unit_label,
          COALESCE(SUM(sri.qty), 0)::int AS qty
        FROM stock_receipts sr
        JOIN stock_receipt_items sri ON sri.stock_receipt_id = sr.id
        WHERE sr.store_id = $1
          AND sr.receipt_date >= $2::date
          AND sr.receipt_date < $3::date
        GROUP BY sr.receipt_date, LOWER(TRIM(sri.item_name)), LOWER(TRIM(sri.unit_label))
        ORDER BY sr.receipt_date, MIN(TRIM(sri.item_name))
      `,
      [storeId, start, end],
    ),
  ]);

  const itemsByDate = new Map<string, MonthlyStockReceiptItem[]>();
  for (const row of itemRes.rows) {
    const current = itemsByDate.get(row.receipt_date) ?? [];
    current.push({
      item_name: row.item_name,
      qty: row.qty,
      unit_label: row.unit_label || "pcs",
    });
    itemsByDate.set(row.receipt_date, current);
  }

  const daily: MonthlyStockReceiptDay[] = dailyRes.rows.map((row) => ({
    receipt_date: row.receipt_date,
    total_qty: row.total_qty,
    receipt_count: row.receipt_count,
    items: itemsByDate.get(row.receipt_date) ?? [],
  }));

  return {
    total_qty: daily.reduce((sum, row) => sum + row.total_qty, 0),
    total_receipts: daily.reduce((sum, row) => sum + row.receipt_count, 0),
    daily,
  };
}