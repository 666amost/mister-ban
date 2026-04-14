import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { maxStockUpdateBodySchema } from "../../modules/inventory/inventory.schemas";
import { readBodyWithSchema } from "../../utils/validate";
import { getPool } from "../../db/pool";
import { updateMaxStock } from "../../modules/inventory/inventory.repo";
import { requireAdmin } from "../../utils/rbac";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);
  const storeId = resolveStoreId(event, user);
  const body = await readBodyWithSchema(event, maxStockUpdateBodySchema);

  await updateMaxStock(getPool(), storeId, body.items);

  return { ok: true };
});
