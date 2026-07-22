import { getPool } from "../../db/pool";
import { requireUser } from "../../modules/auth/session";
import { searchAllStores } from "../../modules/global-search/global-search.repo";
import { globalSearchQuerySchema } from "../../modules/global-search/global-search.schemas";
import { requireAdmin } from "../../utils/rbac";
import { getQueryWithSchema } from "../../utils/validate";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const query = getQueryWithSchema(event, globalSearchQuerySchema);
  return await searchAllStores(getPool(), query.q);
});
