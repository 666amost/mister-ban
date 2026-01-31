import { z } from "zod";
import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { attachProductToStoreForAdmin } from "../../modules/products/products.service";
import { requireAdmin } from "../../utils/rbac";
import { readBodyWithSchema } from "../../utils/validate";

const schema = z.object({
  product_id: z.string().uuid(),
  sell_price: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().optional().default(true),
});

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const storeId = resolveStoreId(event, user);
  const body = await readBodyWithSchema(event, schema);

  return await attachProductToStoreForAdmin({
    storeId,
    productId: body.product_id,
    sellPrice: body.sell_price,
    isActive: body.is_active ?? true,
  });
});

