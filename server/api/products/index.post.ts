import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { createProductBodySchema } from "../../modules/products/products.schemas";
import { createProductForStore } from "../../modules/products/products.service";
import { requireAdmin } from "../../utils/rbac";
import { readBodyWithSchema } from "../../utils/validate";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const storeId = resolveStoreId(event, user);
  const body = await readBodyWithSchema(event, createProductBodySchema);

  return await createProductForStore({
    storeId,
    userId: user.id,
    brand: body.brand,
    productType: body.product_type,
    name: body.name,
    size: body.size,
    sku: body.sku,
    sellPrice: body.sell_price,
    initialQty: body.initial_qty ?? 0,
    initialUnitCost: body.initial_unit_cost ?? 0,
    isActive: body.is_active ?? true,
  });
});
