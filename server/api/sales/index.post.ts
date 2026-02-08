import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { createSaleBodySchema } from "../../modules/sales/sales.schemas";
import { createSale } from "../../modules/sales/sales.service";
import { createError } from "h3";
import { readBodyWithSchema } from "../../utils/validate";

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
  const body = await readBodyWithSchema(event, createSaleBodySchema);
  const expenseOnly = body.expense_only === true;

  try {
    return await createSale({
      storeId,
      userId: user.id,
      saleDate: body.sale_date ?? todayIsoDate(),
      paymentType: expenseOnly ? "CASH" : body.payment_type,
      payments: expenseOnly ? undefined : body.payments,
      plateNo: expenseOnly ? "PENGELUARAN" : (body.plate_no ?? ""),
      items: expenseOnly ? [] : body.items,
      customItems: expenseOnly ? [] : body.custom_items,
      discount: expenseOnly ? 0 : body.discount,
      serviceFee: expenseOnly ? 0 : body.service_fee,
      expenses: body.expenses,
      expenseOnly,
    });
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string; statusCode?: number };
    if (e?.statusCode) throw error;

    const msg = typeof e?.message === "string" ? e.message : "Unknown error";
    const code = typeof e?.code === "string" ? e.code : null;

    if (code === "22P02") throw createError({ statusCode: 400, statusMessage: `Invalid input (${code})` });
    if (code === "23503") throw createError({ statusCode: 400, statusMessage: `Invalid reference (${code})` });
    if (code === "23514") throw createError({ statusCode: 400, statusMessage: `Invalid data (${code})` });

    throw createError({
      statusCode: 500,
      statusMessage: code ? `${msg} (${code})` : msg,
      cause: error,
    });
  }
});
