import type { DbConn } from "../../db/conn";
import { buildProductCategoryCaseSql } from "../../utils/product-category-sql";

const inventoryProductCategorySql = buildProductCategoryCaseSql({
  brandExpr: "b.name",
  productNameExpr: "p.name",
  productTypeExpr: "p.product_type",
});

export type InventoryRow = {
  product_id: string;
  sku: string;
  name: string;
  size: string;
  brand: string;
  product_type: string;
  qty_on_hand: number;
  avg_unit_cost: number;
  sell_price: number | null;
  max_stock: number | null;
  last_adj_at: string | null;
  last_adj_qty_delta: number | null;
  last_adj_by: string | null;
  price_updated_at: string | null;
  price_updated_by: string | null;
};

export type LowStockRow = {
  product_id: string;
  sku: string;
  name: string;
  size: string;
  brand: string;
  product_type: string;
  qty_on_hand: number;
  max_stock: number;
  qty_needed: number;
  sell_price: number | null;
};

export type InventorySummary = {
  ban_qty: number;
  sparepart_qty: number;
  cairan_qty: number;
  ban_dalam_qty: number;
  oli_qty: number;
};

export async function ensureBalances(
  db: DbConn,
  storeId: string,
  productIds: string[],
) {
  if (productIds.length === 0) return;
  await db.query(
    `
      INSERT INTO inventory_balances (store_id, product_id)
      SELECT $1, x.product_id
      FROM unnest($2::uuid[]) AS x(product_id)
      ON CONFLICT (store_id, product_id) DO NOTHING
    `,
    [storeId, productIds],
  );
}

export async function lockBalances(
  db: DbConn,
  storeId: string,
  productIds: string[],
) {
  const { rows } = await db.query<{
    product_id: string;
    qty_on_hand: number;
    avg_unit_cost: number;
  }>(
    `
      SELECT product_id, qty_on_hand, avg_unit_cost
      FROM inventory_balances
      WHERE store_id = $1
        AND product_id = ANY($2::uuid[])
      FOR UPDATE
    `,
    [storeId, productIds],
  );
  return rows;
}

export async function listInventory(
  db: DbConn,
  storeId: string,
  {
    q,
    limit,
    offset,
    category_filter,
    low_stock_only,
  }: {
    q?: string;
    limit: number;
    offset: number;
    category_filter?: string;
    low_stock_only?: boolean;
  },
): Promise<InventoryRow[]> {
  const term = q?.trim() ? q.trim() : null;
  const { rows } = await db.query(
    `
      WITH categorized_products AS (
        SELECT
          p.id,
          p.sku,
          p.name,
          p.size,
          p.product_type,
          p.brand_id,
          ${inventoryProductCategorySql} AS category
        FROM products p
        JOIN brands b ON b.id = p.brand_id
        WHERE p.status = 'active'
      )
      SELECT
        cp.id AS product_id,
        cp.sku,
        cp.name,
        cp.size,
        cp.product_type,
        b.name AS brand,
        COALESCE(ib.qty_on_hand, 0) AS qty_on_hand,
        COALESCE(ib.avg_unit_cost, 0) AS avg_unit_cost,
        sp.sell_price,
        sp.max_stock,
        la.txn_at AS last_adj_at,
        la.qty_delta AS last_adj_qty_delta,
        u_adj.email AS last_adj_by,
        sp.sell_price_updated_at AS price_updated_at,
        u_price.email AS price_updated_by
      FROM store_products sp
      JOIN categorized_products cp ON cp.id = sp.product_id
      JOIN brands b ON b.id = cp.brand_id
      LEFT JOIN inventory_balances ib
        ON ib.store_id = sp.store_id
       AND ib.product_id = sp.product_id
      LEFT JOIN LATERAL (
        SELECT txn_at, qty_delta, created_by
        FROM inventory_ledger
        WHERE store_id = sp.store_id
          AND product_id = sp.product_id
          AND ref_type = 'MANUAL_ADJUST'
        ORDER BY txn_at DESC
        LIMIT 1
      ) la ON true
      LEFT JOIN users u_adj ON u_adj.id = la.created_by
      LEFT JOIN users u_price ON u_price.id = sp.sell_price_updated_by
      WHERE sp.store_id = $1
        AND sp.status = 'active'
        AND sp.sell_price > 0
        AND (
          $2::text IS NULL
          OR cp.sku ILIKE '%' || $2 || '%'
          OR cp.name ILIKE '%' || $2 || '%'
          OR cp.product_type ILIKE '%' || $2 || '%'
          OR cp.size ILIKE '%' || $2 || '%'
          OR b.name ILIKE '%' || $2 || '%'
        )
        AND (
          $5::text IS NULL
          OR cp.category = $5
        )
        AND (
          $6::boolean IS NOT TRUE
          OR (
            sp.max_stock IS NOT NULL
            AND COALESCE(ib.qty_on_hand, 0) < sp.max_stock
          )
        )
      ORDER BY
        CASE WHEN cp.size ~ '-[0-9]+$' THEN CAST(SUBSTRING(cp.size FROM '-([0-9]+)$') AS INTEGER) ELSE 999 END,
        LOWER(TRIM(b.name)),
        CASE WHEN cp.size ~ '^[0-9]+' THEN CAST(SUBSTRING(cp.size FROM '^([0-9]+)') AS INTEGER) ELSE 999 END,
        cp.size, cp.name, cp.sku
      LIMIT $3
      OFFSET $4
    `,
    [storeId, term, limit, offset, category_filter ?? null, low_stock_only ?? false],
  );
  return rows as InventoryRow[];
}

export async function summarizeInventory(
  db: DbConn,
  storeId: string,
  {
    q,
  }: {
    q?: string;
  },
): Promise<InventorySummary> {
  const term = q?.trim() ? q.trim() : null;

  const totalResult = await db.query<{
    ban_qty: number;
    sparepart_qty: number;
    cairan_qty: number;
    ban_dalam_qty: number;
    oli_qty: number;
  }>(
    `
      SELECT
        COALESCE(SUM(
          CASE
            WHEN category = 'BAN'
            THEN qty_on_hand
            ELSE 0
          END
        ), 0)::int AS ban_qty,
        COALESCE(SUM(
          CASE
            WHEN category = 'SPAREPART'
            THEN qty_on_hand
            ELSE 0
          END
        ), 0)::int AS sparepart_qty,
        COALESCE(SUM(
          CASE
            WHEN category = 'CAIRAN'
            THEN qty_on_hand
            ELSE 0
          END
        ), 0)::int AS cairan_qty,
        COALESCE(SUM(
          CASE
            WHEN category = 'BAN_DALAM'
            THEN qty_on_hand
            ELSE 0
          END
        ), 0)::int AS ban_dalam_qty,
        COALESCE(SUM(
          CASE
            WHEN category = 'OLI'
            THEN qty_on_hand
            ELSE 0
          END
        ), 0)::int AS oli_qty
      FROM (
        SELECT
          COALESCE(ib.qty_on_hand, 0) AS qty_on_hand,
        ${inventoryProductCategorySql} AS category
        FROM store_products sp
        JOIN products p ON p.id = sp.product_id
        JOIN brands b ON b.id = p.brand_id
        LEFT JOIN inventory_balances ib
          ON ib.store_id = sp.store_id
         AND ib.product_id = sp.product_id
        WHERE sp.store_id = $1
          AND sp.status = 'active'
          AND p.status = 'active'
          AND (
            $2::text IS NULL
            OR p.sku ILIKE '%' || $2 || '%'
            OR p.name ILIKE '%' || $2 || '%'
            OR p.product_type ILIKE '%' || $2 || '%'
            OR p.size ILIKE '%' || $2 || '%'
            OR b.name ILIKE '%' || $2 || '%'
          )
      ) x
    `,
    [storeId, term],
  );

  const totals = totalResult.rows[0];
  return {
    ban_qty: totals?.ban_qty ?? 0,
    sparepart_qty: totals?.sparepart_qty ?? 0,
    cairan_qty: totals?.cairan_qty ?? 0,
    ban_dalam_qty: totals?.ban_dalam_qty ?? 0,
    oli_qty: totals?.oli_qty ?? 0,
  };
}

export async function listLowStock(
  db: DbConn,
  storeId: string,
  { category_filter, brand_filter }: { category_filter?: string; brand_filter?: string },
): Promise<LowStockRow[]> {
  const { rows } = await db.query(
    `
      WITH categorized_products AS (
        SELECT
          p.id, p.sku, p.name, p.size, p.product_type, p.brand_id,
          ${inventoryProductCategorySql} AS category
        FROM products p
        JOIN brands b ON b.id = p.brand_id
        WHERE p.status = 'active'
      )
      SELECT
        cp.id AS product_id,
        cp.sku,
        cp.name,
        cp.size,
        cp.product_type,
        b.name AS brand,
        COALESCE(ib.qty_on_hand, 0)::int AS qty_on_hand,
        sp.max_stock,
        (sp.max_stock - COALESCE(ib.qty_on_hand, 0))::int AS qty_needed,
        sp.sell_price
      FROM store_products sp
      JOIN categorized_products cp ON cp.id = sp.product_id
      JOIN brands b ON b.id = cp.brand_id
      LEFT JOIN inventory_balances ib
        ON ib.store_id = sp.store_id AND ib.product_id = sp.product_id
      WHERE sp.store_id = $1
        AND sp.status = 'active'
        AND sp.max_stock IS NOT NULL
        AND COALESCE(ib.qty_on_hand, 0) < sp.max_stock
        AND ($2::text IS NULL OR cp.category = $2)
        AND ($3::text IS NULL OR LOWER(TRIM(b.name)) = LOWER(TRIM($3)))
      ORDER BY
        LOWER(TRIM(b.name)),
        CASE WHEN cp.size ~ '-[0-9]+$' THEN CAST(SUBSTRING(cp.size FROM '-([0-9]+)$') AS INTEGER) ELSE 999 END,
        CASE WHEN cp.size ~ '^[0-9]+' THEN CAST(SUBSTRING(cp.size FROM '^([0-9]+)') AS INTEGER) ELSE 999 END,
        cp.size
    `,
    [storeId, category_filter ?? null, brand_filter ?? null],
  );
  return rows as LowStockRow[];
}

export async function updateMaxStock(
  db: DbConn,
  storeId: string,
  items: Array<{ product_id: string; max_stock: number | null }>,
): Promise<void> {
  if (items.length === 0) return;
  for (const item of items) {
    await db.query(
      `
        UPDATE store_products
        SET max_stock = $3
        WHERE store_id = $1 AND product_id = $2
      `,
      [storeId, item.product_id, item.max_stock],
    );
  }
}

export async function countLowStock(
  db: DbConn,
  storeId: string,
): Promise<number> {
  const { rows } = await db.query<{ count: string }>(
    `
      SELECT COUNT(*)::int AS count
      FROM store_products sp
      LEFT JOIN inventory_balances ib
        ON ib.store_id = sp.store_id AND ib.product_id = sp.product_id
      WHERE sp.store_id = $1
        AND sp.status = 'active'
        AND sp.max_stock IS NOT NULL
        AND COALESCE(ib.qty_on_hand, 0) < sp.max_stock
    `,
    [storeId],
  );
  return Number(rows[0]?.count ?? 0);
}
