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
      INNER JOIN products p ON p.id = sp.product_id AND p.status = 'active'
      INNER JOIN brands b ON b.id = p.brand_id
      LEFT JOIN inventory_balances ib ON ib.store_id = sp.store_id AND ib.product_id = sp.product_id
      WHERE sp.store_id = $1
        AND sp.status = 'active'
        AND (
          $2::text IS NULL
          OR p.sku ILIKE '%' || $2 || '%'
          OR p.name ILIKE '%' || $2 || '%'
          OR p.size ILIKE '%' || $2 || '%'
          OR p.product_type ILIKE '%' || $2 || '%'
          OR b.name ILIKE '%' || $2 || '%'
        )
      ORDER BY
        CASE WHEN p.size ~ '-[0-9]+$' THEN CAST(SUBSTRING(p.size FROM '-([0-9]+)$') AS INTEGER) ELSE 999 END,
        LOWER(TRIM(b.name)),
        CASE WHEN p.size ~ '^[0-9]+' THEN CAST(SUBSTRING(p.size FROM '^([0-9]+)') AS INTEGER) ELSE 999 END,
        p.size, p.name, p.sku
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
    brandId,
    productType,
  }: {
    q?: string;
    limit: number;
    offset: number;
    brandId?: string;
    productType?: string;
  },
): Promise<MasterProductRow[]> {
  const term = q?.trim() ? q.trim() : null;
  const filterBrandId = brandId ?? null;
  const filterType = productType?.trim() || null;
  const { rows } = await db.query(
    `
      SELECT
        p.id AS product_id,
        p.sku,
        p.name,
        p.size,
        b.name AS brand,
        p.product_type,
        (p.status = 'active') AS is_active
      FROM products p
      INNER JOIN brands b ON b.id = p.brand_id
      WHERE p.status = 'active'
        AND ($2::uuid IS NULL OR p.brand_id = $2::uuid)
        AND ($3::text IS NULL OR p.product_type = $3)
        AND (
          $1::text IS NULL
          OR p.sku ILIKE '%' || $1 || '%'
          OR p.name ILIKE '%' || $1 || '%'
          OR p.size ILIKE '%' || $1 || '%'
          OR p.product_type ILIKE '%' || $1 || '%'
          OR b.name ILIKE '%' || $1 || '%'
        )
      ORDER BY
        CASE WHEN p.size ~ '-[0-9]+$' THEN CAST(SUBSTRING(p.size FROM '-([0-9]+)$') AS INTEGER) ELSE 999 END,
        LOWER(TRIM(b.name)),
        CASE WHEN p.size ~ '^[0-9]+' THEN CAST(SUBSTRING(p.size FROM '^([0-9]+)') AS INTEGER) ELSE 999 END,
        p.size, p.name, p.sku
      LIMIT $4
      OFFSET $5
    `,
    [term, filterBrandId, filterType, limit, offset],
  );

  return rows as MasterProductRow[];
}

export async function getMasterBrands(db: DbConn): Promise<{ id: string; name: string }[]> {
  const { rows } = await db.query<{ id: string; name: string }>(
    `
      SELECT DISTINCT b.id, b.name
      FROM products p
      INNER JOIN brands b ON b.id = p.brand_id
      WHERE p.status = 'active'
      ORDER BY b.name
    `,
  );
  return rows;
}

export async function getMasterTypes(db: DbConn, brandId: string): Promise<{ product_type: string }[]> {
  const { rows } = await db.query<{ product_type: string }>(
    `
      SELECT DISTINCT product_type
      FROM products
      WHERE brand_id = $1
        AND status = 'active'
        AND product_type IS NOT NULL
        AND TRIM(product_type) != ''
      ORDER BY product_type
    `,
    [brandId],
  );
  return rows;
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
      INSERT INTO products (brand_id, product_type, name, size, sku, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
    [brandId, productType, name, size, sku, isActive ? "active" : "inactive"],
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
      INSERT INTO store_products (store_id, product_id, sell_price, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (store_id, product_id)
      DO UPDATE SET sell_price = EXCLUDED.sell_price, status = EXCLUDED.status
    `,
    [storeId, productId, sellPrice, isActive ? "active" : "inactive"],
  );
}

export async function updateStoreProduct(
  db: DbConn,
  {
    storeId,
    productId,
    sellPrice,
    isActive,
    updatedBy,
  }: {
    storeId: string;
    productId: string;
    sellPrice: number;
    isActive?: boolean;
    updatedBy?: string;
  },
) {
  const nextStatus =
    isActive === undefined ? null : isActive ? "active" : "inactive";
  const { rows } = await db.query(
    `
      UPDATE store_products
      SET
        sell_price = $3,
        status = COALESCE($4::text, status),
        sell_price_updated_at = now(),
        sell_price_updated_by = $5::uuid
      WHERE store_id = $1
        AND product_id = $2
      RETURNING store_id, product_id, sell_price, (status = 'active') AS is_active
    `,
    [storeId, productId, sellPrice, nextStatus, updatedBy ?? null],
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
      SET status = $3
      WHERE store_id = $1
        AND product_id = $2
      RETURNING store_id, product_id, sell_price, (status = 'active') AS is_active
    `,
    [storeId, productId, isActive ? "active" : "inactive"],
  );
  return rows[0] ?? null;
}

export async function deactivateProductsByBrandAndType(
  db: DbConn,
  brandId: string,
  productType: string,
): Promise<number> {
  const { rows } = await db.query(
    `
      UPDATE products
      SET status = 'inactive'
      WHERE brand_id = $1
        AND product_type = $2
        AND status = 'active'
      RETURNING id
    `,
    [brandId, productType],
  );
  return rows.length;
}

export async function updateMasterProduct(
  db: DbConn,
  {
    productId,
    name,
    size,
    sku,
    productType,
    isActive,
  }: {
    productId: string;
    name?: string;
    size?: string;
    sku?: string;
    productType?: string;
    isActive?: boolean;
  },
) {
  const nextStatus =
    isActive === undefined ? null : isActive ? "active" : "inactive";
  const { rows } = await db.query(
    `
      UPDATE products
      SET
        name = COALESCE($2, name),
        size = COALESCE($3, size),
        sku = COALESCE($4, sku),
        product_type = COALESCE($5, product_type),
        status = COALESCE($6::text, status)
      WHERE id = $1
      RETURNING id AS product_id, name, size, sku, product_type, (status = 'active') AS is_active
    `,
    [productId, name ?? null, size ?? null, sku ?? null, productType ?? null, nextStatus],
  );
  return rows[0] ?? null;
}
