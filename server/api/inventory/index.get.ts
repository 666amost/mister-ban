import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { inventoryListQuerySchema } from "../../modules/inventory/inventory.schemas";
import { getQueryWithSchema } from "../../utils/validate";
import { getPool } from "../../db/pool";
import { listInventory, summarizeInventory, countLowStock } from "../../modules/inventory/inventory.repo";
import { requireAdmin } from "../../utils/rbac";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);
  const storeId = resolveStoreId(event, user);
  const query = getQueryWithSchema(event, inventoryListQuerySchema);

  const [items, summary, lowStockCount] = await Promise.all([
    listInventory(getPool(), storeId, {
      q: query.q,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
      category_filter: query.category_filter,
      low_stock_only: query.low_stock_only,
    }),
    summarizeInventory(getPool(), storeId, {
      q: query.q,
    }),
    countLowStock(getPool(), storeId),
  ]);

  return { items, summary, lowStockCount, limit: query.limit ?? 50, offset: query.offset ?? 0 };
});
