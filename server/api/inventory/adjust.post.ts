import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { inventoryAdjustBodySchema } from "../../modules/inventory/inventory.schemas";
import { adjustInventory } from "../../modules/inventory/inventory.service";
import { requireAdmin } from "../../utils/rbac";
import { readBodyWithSchema } from "../../utils/validate";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const storeId = resolveStoreId(event, user);
  const body = await readBodyWithSchema(event, inventoryAdjustBodySchema);

  const item = await adjustInventory({
    storeId,
    userId: user.id,
    productId: body.product_id,
    qtyDelta: body.qty_delta,
    unitCost: body.unit_cost,
    resetAvgCost: body.reset_avg_cost,
    note: body.note,
  });

  return { item };
});
