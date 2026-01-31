import { createError } from "h3";
import { z } from "zod";
import { requireUser } from "../../modules/auth/session";
import { updateSupplierBodySchema } from "../../modules/suppliers/suppliers.schemas";
import { updateSupplier } from "../../modules/suppliers/suppliers.service";
import { requireAdmin } from "../../utils/rbac";
import { readBodyWithSchema } from "../../utils/validate";

const paramsSchema = z.object({ id: z.string().uuid() });

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const params = paramsSchema.safeParse(event.context.params);
  if (!params.success)
    throw createError({ statusCode: 400, statusMessage: "Invalid params" });

  const body = await readBodyWithSchema(event, updateSupplierBodySchema);

  const item = await updateSupplier({
    supplierId: params.data.id,
    name: body.name,
    phone: body.phone,
  });

  return { item };
});
