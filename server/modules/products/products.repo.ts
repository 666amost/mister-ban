import type { DbConn } from "../../db/conn";

export type StoreProductRow = {
  product_id: string;
  sku: string;
  name: string;
  size: string;
  brand: string;
  product_type: string;
  sell_price: number;
  qty_on_hand: number;
  avg_unit_cost: number;
};

export type MasterProductRow = {
  product_id: string;
  sku: string;
  name: string;
  size: string;
  brand: string;
  product_type: string;
  is_active: boolean;
};

export async function listStoreProducts(
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
): Promise<StoreProductRow[]> {
  const term = q?.trim() ? q.trim() : null;
  const { rows } = await db.query(
    `
      SELECT
        p.id AS product_id,
        p.sku,
        p.name,
        p.size,
        b.name AS brand,
        p.product_type,
        sp.sell_price,
        COALESCE(ib.qty_on_hand, 0) AS qty_on_hand,
        COALESCE(ib.avg_unit_cost, 0) AS avg_unit_cost
      FROM store_products sp
      INNER JOIN products p ON p.id = sp.product_id AND p.is_active = true
      INNER JOIN brands b ON b.id = p.brand_id
      LEFT JOIN inventory_balances ib ON ib.store_id = sp.store_id AND ib.product_id = sp.product_id
      WHERE sp.store_id = $1
        AND sp.is_active = true
        AND (
          $2::text IS NULL
          OR p.sku ILIKE '%' || $2 || '%'
          OR p.name ILIKE '%' || $2 || '%'
          OR p.size ILIKE '%' || $2 || '%'
          OR p.product_type ILIKE '%' || $2 || '%'
          OR b.name ILIKE '%' || $2 || '%'
        )
      ORDER BY b.name, p.name, p.size, p.sku
      LIMIT $3
      OFFSET $4
    `,
    [storeId, term, limit, offset],
  );

  return rows as StoreProductRow[];
}

export async function listMasterProducts(
  db: DbConn,
  {
    q,
    limit,
    offset,
  }: {
    q?: string;
    limit: number;
    offset: number;
  },
): Promise<MasterProductRow[]> {
  const term = q?.trim() ? q.trim() : null;
  const { rows } = await db.query(
    `
      SELECT
        p.id AS product_id,
        p.sku,
        p.name,
        p.size,
        b.name AS brand,
        p.product_type,
        p.is_active
      FROM products p
      INNER JOIN brands b ON b.id = p.brand_id
      WHERE p.is_active = true
        AND (
          $1::text IS NULL
          OR p.sku ILIKE '%' || $1 || '%'
          OR p.name ILIKE '%' || $1 || '%'
          OR p.size ILIKE '%' || $1 || '%'
          OR p.product_type ILIKE '%' || $1 || '%'
          OR b.name ILIKE '%' || $1 || '%'
        )
      ORDER BY b.name, p.name, p.size, p.sku
      LIMIT $2
      OFFSET $3
    `,
    [term, limit, offset],
  );

  return rows as MasterProductRow[];
}

export async function upsertBrand(db: DbConn, name: string) {
  const { rows } = await db.query<{ id: string }>(
    `
      INSERT INTO brands (name)
      VALUES ($1)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `,
    [name.trim()],
  );
  return rows[0]?.id as string;
}

export async function createProduct(
  db: DbConn,
  {
    brandId,
    productType,
    name,
    size,
    sku,
    isActive,
  }: {
    brandId: string;
    productType: string;
    name: string;
    size: string;
    sku: string;
    isActive: boolean;
  },
) {
  const { rows } = await db.query<{ id: string }>(
    `
      INSERT INTO products (brand_id, product_type, name, size, sku, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
    [brandId, productType, name, size, sku, isActive],
  );
  return rows[0]?.id as string;
}

export async function attachProductToStore(
  db: DbConn,
  {
    storeId,
    productId,
    sellPrice,
    isActive,
  }: {
    storeId: string;
    productId: string;
    sellPrice: number;
    isActive: boolean;
  },
) {
  await db.query(
    `
      INSERT INTO store_products (store_id, product_id, sell_price, is_active)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (store_id, product_id)
      DO UPDATE SET sell_price = EXCLUDED.sell_price, is_active = EXCLUDED.is_active
    `,
    [storeId, productId, sellPrice, isActive],
  );
}

export async function updateStoreProduct(
  db: DbConn,
  {
    storeId,
    productId,
    sellPrice,
    isActive,
  }: {
    storeId: string;
    productId: string;
    sellPrice: number;
    isActive?: boolean;
  },
) {
  const { rows } = await db.query(
    `
      UPDATE store_products
      SET
        sell_price = $3,
        is_active = COALESCE($4::boolean, is_active)
      WHERE store_id = $1
        AND product_id = $2
      RETURNING store_id, product_id, sell_price, is_active
    `,
    [storeId, productId, sellPrice, isActive !== undefined ? isActive : null],
  );
  return rows[0] ?? null;
}

export async function setStoreProductActive(
  db: DbConn,
  {
    storeId,
    productId,
    isActive,
  }: {
    storeId: string;
    productId: string;
    isActive: boolean;
  },
) {
  const { rows } = await db.query(
    `
      UPDATE store_products
      SET is_active = $3
      WHERE store_id = $1
        AND product_id = $2
      RETURNING store_id, product_id, sell_price, is_active
    `,
    [storeId, productId, isActive],
  );
  return rows[0] ?? null;
}

export async function updateMasterProduct(
  db: DbConn,
  {
    productId,
    name,
    size,
    productType,
    isActive,
  }: {
    productId: string;
    name?: string;
    size?: string;
    productType?: string;
    isActive?: boolean;
  },
) {
  const { rows } = await db.query(
    `
      UPDATE products
      SET
        name = COALESCE($2, name),
        size = COALESCE($3, size),
        product_type = COALESCE($4, product_type),
        is_active = COALESCE($5::boolean, is_active)
      WHERE id = $1
      RETURNING id AS product_id, name, size, product_type, is_active
    `,
    [productId, name ?? null, size ?? null, productType ?? null, isActive !== undefined ? isActive : null],
  );
  return rows[0] ?? null;
}
