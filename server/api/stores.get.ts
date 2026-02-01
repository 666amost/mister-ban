import { getPool } from "../db/pool";
import { requireUser } from "../modules/auth/session";
import { listStores } from "../modules/stores/stores.repo";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  
  if (user.role === "STAFF") {
    throw createError({ statusCode: 403, statusMessage: "Akses ditolak" });
  }
  
  const stores = await listStores(getPool());
  return { stores };
});
