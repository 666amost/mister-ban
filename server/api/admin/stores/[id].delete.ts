import { getPool } from "../../../db/pool";
import { requireUser } from "../../../modules/auth/session";
import { storeExists } from "../../../modules/stores/stores.repo";
import { requireAdmin } from "../../../utils/rbac";
import { badRequest, notFound } from "../../../utils/http";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const id = getRouterParam(event, "id");
  if (!id) throw badRequest("ID toko tidak valid");

  const pool = getPool();

  const exists = await storeExists(pool, id);
  if (!exists) throw notFound("Toko tidak ditemukan");

  const { rows } = await pool.query(
    `SELECT
      (SELECT COUNT(*) FROM sales WHERE store_id = $1) AS sales_count,
      (SELECT COUNT(*) FROM stock_receipts WHERE store_id = $1) AS receipts_count`,
    [id],
  );

  const salesCount = Number((rows[0] as { sales_count: string }).sales_count);
  const receiptsCount = Number((rows[0] as { receipts_count: string }).receipts_count);

  if (salesCount > 0 || receiptsCount > 0) {
    throw badRequest(
      `Toko tidak dapat dihapus karena memiliki ${salesCount} transaksi penjualan dan ${receiptsCount} penerimaan stok`,
    );
  }

  await pool.query("DELETE FROM stores WHERE id = $1", [id]);

  return { success: true };
});
