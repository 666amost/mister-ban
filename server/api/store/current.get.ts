import { getPool } from "../../db/pool";
import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { getStoreById } from "../../modules/stores/stores.repo";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);

  if (user.role === "ADMIN") {
    try {
      const storeId = resolveStoreId(event, user);
      const store = await getStoreById(getPool(), storeId);
      return { store };
    } catch (error: unknown) {
      const e = error as { statusCode?: number };
      if (e && typeof e === "object" && e.statusCode === 403)
        return { store: null };
      throw error;
    }
  }

  const storeId = resolveStoreId(event, user);
  const store = await getStoreById(getPool(), storeId);
  return { store };
});
