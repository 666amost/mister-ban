import { createError, getMethod } from "h3";
import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import {
  createStockReceiptBodySchema,
  deleteStockReceiptQuerySchema,
  stockReceiptsListQuerySchema,
} from "../../modules/stock-receipts/stock-receipts.schemas";
import {
  createStockReceipt,
  deleteStockReceipt,
  listStockReceipts,
} from "../../modules/stock-receipts/stock-receipts.service";
import { requireAdmin } from "../../utils/rbac";
import {
  getQueryWithSchema,
  readBodyWithSchema,
} from "../../utils/validate";

function todayIsoDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return new Date().toISOString().slice(0, 10);
  return `${year}-${month}-${day}`;
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const storeId = resolveStoreId(event, user);
  const method = getMethod(event);

  if (method === "GET") {
    const query = getQueryWithSchema(event, stockReceiptsListQuerySchema);
    const isAdmin = user.role === "ADMIN";
    const lastThreeMonths =
      (query.history_range === "last_3_months" || query.all_dates === "true") && isAdmin;
    const allHistory = query.history_range === "all" && isAdmin;
    const dateVal = query.date ?? todayIsoDate();
    const items = await listStockReceipts({
      storeId,
      date: dateVal,
      lastThreeMonths,
      allHistory,
      q: query.q,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });

    return {
      items,
      date: dateVal,
      history_range: allHistory ? "all" : lastThreeMonths ? "last_3_months" : query.date ? "date" : "today",
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    };
  }

  if (method === "POST") {
    const body = await readBodyWithSchema(event, createStockReceiptBodySchema);
    const receiptDate = user.role === "ADMIN" ? (body.receipt_date ?? todayIsoDate()) : todayIsoDate();
    return await createStockReceipt({
      storeId,
      userId: user.id,
      receiptDate,
      items: body.items,
    });
  }

  if (method === "DELETE") {
    requireAdmin(user);
    const query = getQueryWithSchema(event, deleteStockReceiptQuerySchema);
    await deleteStockReceipt({ storeId, receiptId: query.id });
    return { ok: true };
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
