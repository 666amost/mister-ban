import { requireUser } from "../../modules/auth/session";
import { createSupplierBodySchema } from "../../modules/suppliers/suppliers.schemas";
import { createSupplier } from "../../modules/suppliers/suppliers.service";
import { requireAdmin } from "../../utils/rbac";
import { readBodyWithSchema } from "../../utils/validate";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const body = await readBodyWithSchema(event, createSupplierBodySchema);

  const item = await createSupplier({
    name: body.name,
    phone: body.phone ?? null,
  });

  return { item };
});

