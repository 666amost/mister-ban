import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { getPool } from "../../db/pool";
import { listLowStock } from "../../modules/inventory/inventory.repo";
import { requireAdmin } from "../../utils/rbac";
import { getQueryWithSchema } from "../../utils/validate";
import { z } from "zod";

const querySchema = z.object({
  category_filter: z.enum(["BAN", "SPAREPART", "CAIRAN", "BAN_DALAM", "OLI"]).optional(),
});

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);
  const storeId = resolveStoreId(event, user);
  const query = getQueryWithSchema(event, querySchema);

  const rows = await listLowStock(getPool(), storeId, {
    category_filter: query.category_filter,
  });

  return { items: rows };
});
