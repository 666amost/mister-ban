import { createError } from "h3";
import { z } from "zod";
import { requireUser } from "../../../modules/auth/session";
import { updateMasterProductForAdmin } from "../../../modules/products/products.service";
import { requireAdmin } from "../../../utils/rbac";
import { readBodyWithSchema } from "../../../utils/validate";

const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  size: z.string().trim().min(1).optional(),
  product_type: z.string().trim().min(1).optional(),
  is_active: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const params = paramsSchema.safeParse(event.context.params);
  if (!params.success)
    throw createError({ statusCode: 400, statusMessage: "Invalid params" });

  const body = await readBodyWithSchema(event, bodySchema);
  return await updateMasterProductForAdmin({
    productId: params.data.id,
    name: body.name,
    size: body.size,
    productType: body.product_type,
    isActive: body.is_active,
  });
});

