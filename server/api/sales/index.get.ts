import { getPool } from "../../db/pool";
import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { salesListQuerySchema } from "../../modules/sales/sales.schemas";
import { listSales, getSalesQtySummary } from "../../modules/sales/sales.service";
import { getQueryWithSchema } from "../../utils/validate";

function todayIsoDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) return new Date().toISOString().slice(0, 10);
  return `${year}-${month}-${day}`;
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const storeId = resolveStoreId(event, user);
  const query = getQueryWithSchema(event, salesListQuerySchema);
  const isAdmin = user.role === "ADMIN";

  const allDates = query.all_dates === "true" && isAdmin;
  const dateVal = query.date ?? todayIsoDate();
  const db = getPool();

  const [items, qty_summary] = await Promise.all([
    listSales({
      db,
      storeId,
      date: dateVal,
      allDates,
      hideExpenseOnly: !isAdmin,
      q: query.q,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    }),
    getSalesQtySummary({
      db,
      storeId,
      date: dateVal,
      allDates,
    }),
  ]);

  return {
    items,
    qty_summary,
    date: dateVal,
    all_dates: allDates,
    can_expense_only: true,
    limit: query.limit ?? 50,
    offset: query.offset ?? 0,
  };
});
