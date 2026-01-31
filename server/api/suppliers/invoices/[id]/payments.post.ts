import { createError } from "h3";
import { z } from "zod";
import { requireUser } from "../../../../modules/auth/session";
import { resolveStoreId } from "../../../../modules/store/store-context";
import { createSupplierPaymentBodySchema } from "../../../../modules/suppliers/supplier-invoices.schemas";
import { addSupplierPayment } from "../../../../modules/suppliers/supplier-invoices.service";
import { requireAdmin } from "../../../../utils/rbac";
import { readBodyWithSchema } from "../../../../utils/validate";

const paramsSchema = z.object({ id: z.string().uuid() });

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const storeId = resolveStoreId(event, user);
  const params = paramsSchema.safeParse(event.context.params);
  if (!params.success)
    throw createError({ statusCode: 400, statusMessage: "Invalid params" });

  const body = await readBodyWithSchema(event, createSupplierPaymentBodySchema);

  const result = await addSupplierPayment({
    storeId,
    userId: user.id,
    invoiceId: params.data.id,
    paidAt: body.paid_at ?? todayIsoDate(),
    amount: body.amount,
    paymentMethod: body.payment_method,
    note: body.note,
  });

  return { item: result };
});
