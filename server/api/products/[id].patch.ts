import { createError } from "h3";
import { z } from "zod";
import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { updateStoreProductBodySchema } from "../../modules/products/products.schemas";
import { updateStoreProductForStore } from "../../modules/products/products.service";
import { requireAdmin } from "../../utils/rbac";
import { readBodyWithSchema } from "../../utils/validate";

const paramsSchema = z.object({ id: z.string().uuid() });

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const storeId = resolveStoreId(event, user);
  const params = paramsSchema.safeParse(event.context.params);
  if (!params.success)
    throw createError({ statusCode: 400, statusMessage: "Invalid params" });

  const body = await readBodyWithSchema(event, updateStoreProductBodySchema);

  const updated = await updateStoreProductForStore({
    storeId,
    productId: params.data.id,
    sellPrice: body.sell_price,
    isActive: body.is_active,
  });

  return { item: updated };
});
