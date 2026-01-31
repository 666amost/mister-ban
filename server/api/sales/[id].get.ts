import { createError } from "h3";
import { z } from "zod";
import { getPool } from "../../db/pool";
import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { getSaleDetail } from "../../modules/sales/sales.service";

const paramsSchema = z.object({ id: z.string().uuid() });

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const storeId = resolveStoreId(event, user);
  const params = paramsSchema.safeParse(event.context.params);
  if (!params.success)
    throw createError({ statusCode: 400, statusMessage: "Invalid params" });

  const detail = await getSaleDetail({
    db: getPool(),
    storeId,
    saleId: params.data.id,
  });
  if (!detail)
    throw createError({ statusCode: 404, statusMessage: "Sale not found" });

  return detail;
});
