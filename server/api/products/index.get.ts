import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { productListQuerySchema } from "../../modules/products/products.schemas";
import { listProductsForStore } from "../../modules/products/products.service";
import { getQueryWithSchema } from "../../utils/validate";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const storeId = resolveStoreId(event, user);
  const query = getQueryWithSchema(event, productListQuerySchema);

  const items = await listProductsForStore({
    storeId,
    q: query.q,
    limit: query.limit,
    offset: query.offset,
  });

  return { items, limit: query.limit ?? 50, offset: query.offset ?? 0 };
});
