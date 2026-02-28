import { requireUser } from "../../modules/auth/session";
import { storesSummaryQuerySchema } from "../../modules/reports/reports.schemas";
import { getStoresSummary } from "../../modules/reports/reports.service";
import { requireAdmin } from "../../utils/rbac";
import { getQueryWithSchema } from "../../utils/validate";

function thisMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);
  const query = getQueryWithSchema(event, storesSummaryQuerySchema);

  const stores = await getStoresSummary({
    month: query.month ?? thisMonth(),
  });
  return { stores };
});
