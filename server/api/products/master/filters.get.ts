import { z } from "zod";
import { requireUser } from "../../../modules/auth/session";
import { getMasterFilters } from "../../../modules/products/products.service";
import { requireAdmin } from "../../../utils/rbac";
import { getQueryWithSchema } from "../../../utils/validate";

const filtersQuerySchema = z.object({
  brand_id: z.string().trim().min(1).optional(),
});

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const query = getQueryWithSchema(event, filtersQuerySchema);
  const result = await getMasterFilters(query.brand_id);

  return result;
});
