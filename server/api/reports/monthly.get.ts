import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { monthlyReportQuerySchema } from "../../modules/reports/reports.schemas";
import { getMonthlyReport } from "../../modules/reports/reports.service";
import { requireAdmin } from "../../utils/rbac";
import { getQueryWithSchema } from "../../utils/validate";

function thisMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);
  const storeId = resolveStoreId(event, user);
  const query = getQueryWithSchema(event, monthlyReportQuerySchema);

  const report = await getMonthlyReport({
    storeId,
    month: query.month ?? thisMonth(),
  });
  return { report };
});
