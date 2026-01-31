import { z } from "zod";
import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { removeProductFromStoreForAdmin } from "../../modules/products/products.service";
import { requireAdmin } from "../../utils/rbac";
import { readBodyWithSchema } from "../../utils/validate";

const schema = z.object({
  product_id: z.string().uuid(),
});

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const storeId = resolveStoreId(event, user);
  const body = await readBodyWithSchema(event, schema);

  return await removeProductFromStoreForAdmin({
    storeId,
    productId: body.product_id,
  });
});

