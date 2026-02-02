import { createError } from "h3";
import { z } from "zod";
import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { updateSaleBodySchema } from "../../modules/sales/sales.schemas";
import { updateSaleFields } from "../../modules/sales/sales.service";
import { requireAdmin } from "../../utils/rbac";
import { readBodyWithSchema } from "../../utils/validate";

const paramsSchema = z.object({ id: z.string().uuid() });

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const storeId = resolveStoreId(event, user);
  const params = paramsSchema.safeParse(event.context.params);
  if (!params.success)
    throw createError({ statusCode: 400, statusMessage: "Invalid params" });

  const body = await readBodyWithSchema(event, updateSaleBodySchema);

  const updated = await updateSaleFields({
    storeId,
    saleId: params.data.id,
    paymentType: body.payment_type,
    plateNo: body.plate_no,
    discount: body.discount,
    serviceFee: body.service_fee,
    items: body.items,
    customItems: body.custom_items,
  });

  return { item: updated };
});

