import type { DbConn } from "../../db/conn";

export type StoreRow = { id: string; name: string };

export async function listStores(db: DbConn): Promise<StoreRow[]> {
  const { rows } = await db.query(
    "SELECT id, name FROM stores ORDER BY name ASC",
  );
  return rows as StoreRow[];
}

export async function getStoreById(
  db: DbConn,
  storeId: string,
): Promise<StoreRow | null> {
  const { rows } = await db.query(
    "SELECT id, name FROM stores WHERE id = $1 LIMIT 1",
    [storeId],
  );
  return (rows[0] as StoreRow | undefined) ?? null;
}

export async function storeExists(db: DbConn, storeId: string) {
  const { rows } = await db.query(
    "SELECT 1 FROM stores WHERE id = $1 LIMIT 1",
    [storeId],
  );
  return rows.length > 0;
}
