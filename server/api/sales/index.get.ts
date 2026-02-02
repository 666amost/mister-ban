import { getPool } from "../../db/pool";
import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { salesListQuerySchema } from "../../modules/sales/sales.schemas";
import { listSales } from "../../modules/sales/sales.service";
import { getQueryWithSchema } from "../../utils/validate";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const storeId = resolveStoreId(event, user);
  const query = getQueryWithSchema(event, salesListQuerySchema);

  const allDates = query.all_dates === "true" && user.role === "ADMIN";

  const items = await listSales({
    db: getPool(),
    storeId,
    date: query.date ?? todayIsoDate(),
    allDates,
    q: query.q,
    limit: query.limit ?? 50,
    offset: query.offset ?? 0,
  });

  return {
    items,
    date: query.date ?? todayIsoDate(),
    all_dates: allDates,
    limit: query.limit ?? 50,
    offset: query.offset ?? 0,
  };
});
