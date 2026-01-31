import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { dailyReportQuerySchema } from "../../modules/reports/reports.schemas";
import { getDailyReport } from "../../modules/reports/reports.service";
import { requireAdmin } from "../../utils/rbac";
import { getQueryWithSchema } from "../../utils/validate";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);
  const storeId = resolveStoreId(event, user);
  const query = getQueryWithSchema(event, dailyReportQuerySchema);

  const report = await getDailyReport({
    storeId,
    date: query.date ?? todayIsoDate(),
  });
  return { report };
});
