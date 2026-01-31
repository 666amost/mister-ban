import { requireUser } from "../../modules/auth/session";
import { suppliersListQuerySchema } from "../../modules/suppliers/suppliers.schemas";
import { listSuppliers } from "../../modules/suppliers/suppliers.service";
import { requireAdmin } from "../../utils/rbac";
import { getQueryWithSchema } from "../../utils/validate";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const query = getQueryWithSchema(event, suppliersListQuerySchema);

  const items = await listSuppliers({
    q: query.q,
    limit: query.limit ?? 50,
    offset: query.offset ?? 0,
  });

  return { items, limit: query.limit ?? 50, offset: query.offset ?? 0 };
});

