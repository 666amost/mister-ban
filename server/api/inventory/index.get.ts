import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { inventoryListQuerySchema } from "../../modules/inventory/inventory.schemas";
import { getQueryWithSchema } from "../../utils/validate";
import { getPool } from "../../db/pool";
import { listInventory } from "../../modules/inventory/inventory.repo";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const storeId = resolveStoreId(event, user);
  const query = getQueryWithSchema(event, inventoryListQuerySchema);

  const items = await listInventory(getPool(), storeId, {
    q: query.q,
    limit: query.limit ?? 50,
    offset: query.offset ?? 0,
  });

  return { items, limit: query.limit ?? 50, offset: query.offset ?? 0 };
});
