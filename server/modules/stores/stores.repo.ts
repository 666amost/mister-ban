import type { DbConn } from "../../db/conn";

export type StoreListRow = { id: string; name: string };

export type StoreDetailRow = StoreListRow & {
  code: string | null;
  address: string | null;
  city: string | null;
  operating_hours: string | null;
  status: "active" | "inactive" | null;
};

export async function listStores(db: DbConn): Promise<StoreListRow[]> {
  const { rows } = await db.query(
    "SELECT id, name FROM stores ORDER BY name ASC",
  );
  return rows as StoreListRow[];
}

export async function getStoreById(
  db: DbConn,
  storeId: string,
): Promise<StoreDetailRow | null> {
  const { rows } = await db.query(
    `
      SELECT
        id,
        name,
        code,
        address,
        city,
        operating_hours,
        status
      FROM stores
      WHERE id = $1
      LIMIT 1
    `,
    [storeId],
  );
  return (rows[0] as StoreDetailRow | undefined) ?? null;
}

export async function storeExists(db: DbConn, storeId: string) {
  const { rows } = await db.query(
    "SELECT 1 FROM stores WHERE id = $1 LIMIT 1",
    [storeId],
  );
  return rows.length > 0;
}
