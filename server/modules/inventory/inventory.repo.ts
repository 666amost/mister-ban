import type { DbConn } from "../../db/conn";

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
  }: {
    q?: string;
    limit: number;
    offset: number;
    category_filter?: string;
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
          CASE
            WHEN LOWER(TRIM(b.name)) = 'oli'
                 OR UPPER(TRIM(p.product_type)) = 'OLI'
            THEN 'OLI'
            WHEN LOWER(TRIM(b.name)) IN ('disc pad', 'disc')
                 OR UPPER(TRIM(p.product_type)) = 'SPAREPART'
            THEN 'SPAREPART'
            WHEN LOWER(TRIM(b.name)) IN ('iml', 'cairan')
                 OR LOWER(p.name) LIKE '%cairan%'
                 OR LOWER(TRIM(p.product_type)) = 'cairan'
            THEN 'CAIRAN'
            WHEN LOWER(TRIM(b.name)) = 'ban dalam'
                 OR LOWER(p.name) LIKE '%ban dalam%'
                 OR LOWER(p.name) LIKE '%tube%'
                 OR LOWER(TRIM(p.product_type)) LIKE 'tr%'
            THEN 'BAN_DALAM'
            ELSE 'BAN'
          END AS category
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
        sp.sell_price
      FROM store_products sp
      JOIN categorized_products cp ON cp.id = sp.product_id
      JOIN brands b ON b.id = cp.brand_id
      LEFT JOIN inventory_balances ib
        ON ib.store_id = sp.store_id
       AND ib.product_id = sp.product_id
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
      ORDER BY
        CASE WHEN cp.size ~ '-[0-9]+$' THEN CAST(SUBSTRING(cp.size FROM '-([0-9]+)$') AS INTEGER) ELSE 999 END,
        LOWER(TRIM(b.name)),
        CASE WHEN cp.size ~ '^[0-9]+' THEN CAST(SUBSTRING(cp.size FROM '^([0-9]+)') AS INTEGER) ELSE 999 END,
        cp.size, cp.name, cp.sku
      LIMIT $3
      OFFSET $4
    `,
    [storeId, term, limit, offset, category_filter ?? null],
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
          CASE
            WHEN LOWER(TRIM(b.name)) = 'oli'
                 OR UPPER(TRIM(p.product_type)) = 'OLI'
            THEN 'OLI'
            WHEN LOWER(TRIM(b.name)) IN ('disc pad', 'disc')
                 OR UPPER(TRIM(p.product_type)) = 'SPAREPART'
            THEN 'SPAREPART'
            WHEN LOWER(TRIM(b.name)) IN ('iml', 'cairan')
                 OR LOWER(p.name) LIKE '%cairan%'
                 OR LOWER(TRIM(p.product_type)) = 'cairan'
            THEN 'CAIRAN'
            WHEN LOWER(TRIM(b.name)) = 'ban dalam'
                 OR LOWER(p.name) LIKE '%ban dalam%'
                 OR LOWER(p.name) LIKE '%tube%'
                 OR LOWER(TRIM(p.product_type)) LIKE 'tr%'
            THEN 'BAN_DALAM'
            ELSE 'BAN'
          END AS category
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
