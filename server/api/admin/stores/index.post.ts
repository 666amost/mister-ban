import { z } from "zod";
import { getPool } from "../../../db/pool";
import { requireUser } from "../../../modules/auth/session";
import { createStore, storeExists } from "../../../modules/stores/stores.repo";
import { requireAdmin } from "../../../utils/rbac";
import { readBodyWithSchema } from "../../../utils/validate";
import { badRequest } from "../../../utils/http";

const bodySchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().max(20).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  source_store_id: z.string().uuid().nullable().optional(),
  copy_inventory: z.boolean().default(false),
});

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const body = await readBodyWithSchema(event, bodySchema);
  const pool = getPool();

  if (body.source_store_id) {
    const exists = await storeExists(pool, body.source_store_id);
    if (!exists) throw badRequest("Toko sumber tidak ditemukan");
  }

  const store = await createStore(pool, {
    name: body.name,
    code: body.code,
    address: body.address,
    city: body.city,
  });

  if (body.source_store_id) {
    await pool.query(
      `INSERT INTO store_products (store_id, product_id, sell_price, default_payment_type, status, max_stock)
       SELECT $1, product_id, sell_price, default_payment_type, status, max_stock
       FROM store_products
       WHERE store_id = $2
       ON CONFLICT (store_id, product_id) DO NOTHING`,
      [store.id, body.source_store_id],
    );

    if (body.copy_inventory) {
      await pool.query(
        `INSERT INTO inventory_balances (store_id, product_id, qty_on_hand, avg_unit_cost, updated_at)
         SELECT $1, product_id, qty_on_hand, avg_unit_cost, NOW()
         FROM inventory_balances
         WHERE store_id = $2
         ON CONFLICT (store_id, product_id) DO NOTHING`,
        [store.id, body.source_store_id],
      );
    }
  }

  return { store };
});

