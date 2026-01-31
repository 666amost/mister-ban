import { requireUser } from "../../modules/auth/session";
import { productListQuerySchema } from "../../modules/products/products.schemas";
import { listMasterProducts } from "../../modules/products/products.service";
import { requireAdmin } from "../../utils/rbac";
import { getQueryWithSchema } from "../../utils/validate";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const query = getQueryWithSchema(event, productListQuerySchema);
  const items = await listMasterProducts({
    q: query.q,
    limit: query.limit,
    offset: query.offset,
  });

  return { items, limit: query.limit ?? 50, offset: query.offset ?? 0 };
});

