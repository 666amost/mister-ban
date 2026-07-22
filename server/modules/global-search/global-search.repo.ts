import type { DbConn } from "../../db/conn";

export type GlobalInventoryResult = {
  product_id: string;
  sku: string;
  product_name: string;
  size: string;
  brand: string;
  product_type: string;
  store_id: string;
  store_name: string;
  qty_on_hand: number;
  sell_price: number;
};

export type GlobalPlateResult = {
  plate_no: string;
  store_id: string;
  store_name: string;
  last_visit: string | null;
};

export async function searchAllStores(db: DbConn, query: string) {
  const normalizedPlate = query.toUpperCase().replace(/[^A-Z0-9]/g, "");

  const inventorySearch = db.query<GlobalInventoryResult>(
    `
      SELECT
        p.id AS product_id,
        p.sku,
        p.name AS product_name,
        p.size,
        b.name AS brand,
        p.product_type,
        s.id AS store_id,
        s.name AS store_name,
        COALESCE(ib.qty_on_hand, 0)::int AS qty_on_hand,
        sp.sell_price::int AS sell_price
      FROM store_products sp
      JOIN stores s ON s.id = sp.store_id
      JOIN products p ON p.id = sp.product_id
      JOIN brands b ON b.id = p.brand_id
      LEFT JOIN inventory_balances ib
        ON ib.store_id = sp.store_id
       AND ib.product_id = sp.product_id
      WHERE sp.status = 'active'
        AND p.status = 'active'
        AND COALESCE(s.status, 'active') = 'active'
        AND COALESCE(ib.qty_on_hand, 0) > 0
        AND (
          p.sku ILIKE '%' || $1 || '%'
          OR p.name ILIKE '%' || $1 || '%'
          OR p.product_type ILIKE '%' || $1 || '%'
          OR p.size ILIKE '%' || $1 || '%'
          OR b.name ILIKE '%' || $1 || '%'
          OR CONCAT_WS(' ', b.name, p.name, p.product_type, p.size, p.sku)
             ILIKE '%' || $1 || '%'
        )
      ORDER BY LOWER(p.name), LOWER(b.name), p.size, qty_on_hand DESC, LOWER(s.name)
      LIMIT 100
    `,
    [query],
  );

  // Trigram indexes are effective from three characters. Skipping shorter plate
  // terms prevents broad searches from scanning a growing customer history.
  const plateSearch = normalizedPlate.length >= 3
    ? db.query<GlobalPlateResult>(
        `
          WITH candidate_matches AS MATERIALIZED (
            (
              SELECT
                c.store_id,
                c.plate_no,
                c.created_at,
                UPPER(REGEXP_REPLACE(c.plate_no, '[^A-Za-z0-9]', '', 'g')) AS normalized_plate,
                0 AS exact_rank
              FROM customers c
              WHERE UPPER(REGEXP_REPLACE(c.plate_no, '[^A-Za-z0-9]', '', 'g')) = $1
              LIMIT 50
            )
            UNION ALL
            (
              SELECT
                c.store_id,
                c.plate_no,
                c.created_at,
                UPPER(REGEXP_REPLACE(c.plate_no, '[^A-Za-z0-9]', '', 'g')) AS normalized_plate,
                1 AS exact_rank
              FROM customers c
              WHERE UPPER(REGEXP_REPLACE(c.plate_no, '[^A-Za-z0-9]', '', 'g'))
                LIKE '%' || $1 || '%'
                AND UPPER(REGEXP_REPLACE(c.plate_no, '[^A-Za-z0-9]', '', 'g')) <> $1
              LIMIT 250
            )
          ),
          unique_matches AS MATERIALIZED (
            SELECT DISTINCT ON (cm.store_id, cm.normalized_plate)
              cm.store_id,
              cm.plate_no,
              cm.normalized_plate,
              cm.exact_rank
            FROM candidate_matches cm
            ORDER BY
              cm.store_id,
              cm.normalized_plate,
              cm.exact_rank,
              cm.created_at DESC
          )
          SELECT
            lm.plate_no,
            s.id AS store_id,
            s.name AS store_name,
            latest_sale.last_visit::text
          FROM unique_matches lm
          JOIN stores s ON s.id = lm.store_id
          LEFT JOIN LATERAL (
            SELECT sa.sale_date AS last_visit
            FROM sales sa
            WHERE sa.store_id = lm.store_id
              AND UPPER(REGEXP_REPLACE(sa.customer_plate_no, '[^A-Za-z0-9]', '', 'g')) =
                  lm.normalized_plate
            ORDER BY sa.sale_date DESC
            LIMIT 1
          ) latest_sale ON true
          WHERE COALESCE(s.status, 'active') = 'active'
          ORDER BY
            lm.exact_rank,
            latest_sale.last_visit DESC NULLS LAST,
            LOWER(s.name)
          LIMIT 50
        `,
        [normalizedPlate],
      )
    : Promise.resolve({ rows: [] as GlobalPlateResult[] });

  const [inventoryResult, plateResult] = await Promise.all([
    inventorySearch,
    plateSearch,
  ]);

  return {
    inventory: inventoryResult.rows,
    plates: plateResult.rows,
  };
}
