import type { DbConn } from "../../db/conn";

export type InventoryRow = {
  product_id: string;
  sku: string;
  name: string;
  size: string;
  brand: string;
  qty_on_hand: number;
  avg_unit_cost: number;
  sell_price: number | null;
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
  }: {
    q?: string;
    limit: number;
    offset: number;
  },
): Promise<InventoryRow[]> {
  const term = q?.trim() ? q.trim() : null;
  const { rows } = await db.query(
    `
      SELECT
        p.id AS product_id,
        p.sku,
        p.name,
        p.size,
        b.name AS brand,
        COALESCE(ib.qty_on_hand, 0) AS qty_on_hand,
        COALESCE(ib.avg_unit_cost, 0) AS avg_unit_cost,
        sp.sell_price
      FROM store_products sp
      JOIN products p ON p.id = sp.product_id
      JOIN brands b ON b.id = p.brand_id
      LEFT JOIN inventory_balances ib
        ON ib.store_id = sp.store_id
       AND ib.product_id = sp.product_id
      WHERE sp.store_id = $1
        AND sp.status = 'active'
        AND p.status = 'active'
        AND sp.sell_price > 0
        AND (
          $2::text IS NULL
          OR p.sku ILIKE '%' || $2 || '%'
          OR p.name ILIKE '%' || $2 || '%'
          OR p.size ILIKE '%' || $2 || '%'
          OR b.name ILIKE '%' || $2 || '%'
        )
      ORDER BY b.name, p.name, p.size, p.sku
      LIMIT $3
      OFFSET $4
    `,
    [storeId, term, limit, offset],
  );
  return rows as InventoryRow[];
}
