import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { createSaleBodySchema } from "../../modules/sales/sales.schemas";
import { createSale } from "../../modules/sales/sales.service";
import { createError } from "h3";
import { readBodyWithSchema } from "../../utils/validate";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const storeId = resolveStoreId(event, user);
  const body = await readBodyWithSchema(event, createSaleBodySchema);

  try {
    return await createSale({
      storeId,
      userId: user.id,
      saleDate: body.sale_date ?? todayIsoDate(),
      paymentType: body.payment_type,
      plateNo: body.plate_no,
      items: body.items,
      customItems: body.custom_items,
      discount: body.discount,
      serviceFee: body.service_fee,
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
