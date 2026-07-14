import { getPool } from "../../db/pool";
import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { getStoreById } from "../../modules/stores/stores.repo";
import { requireAdmin } from "../../utils/rbac";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);
  const store = await getStoreById(getPool(), resolveStoreId(event, user));
  if (!store) throw createError({ statusCode: 404, statusMessage: "Toko tidak ditemukan" });
  return { store };
});
