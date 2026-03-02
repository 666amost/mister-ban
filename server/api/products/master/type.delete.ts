import { z } from "zod";
import { requireUser } from "../../../modules/auth/session";
import { deleteProductTypeForAdmin } from "../../../modules/products/products.service";
import { requireAdmin } from "../../../utils/rbac";
import { getQueryWithSchema } from "../../../utils/validate";

const querySchema = z.object({
  brand_id: z.string().trim().uuid(),
  product_type: z.string().trim().min(1),
});

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const query = getQueryWithSchema(event, querySchema);
  const result = await deleteProductTypeForAdmin({
    brandId: query.brand_id,
    productType: query.product_type,
  });

  return result;
});
