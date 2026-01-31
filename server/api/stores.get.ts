import { getPool } from "../db/pool";
import { requireUser } from "../modules/auth/session";
import { listStores } from "../modules/stores/stores.repo";
import { requireAdmin } from "../utils/rbac";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);
  const stores = await listStores(getPool());
  return { stores };
});
