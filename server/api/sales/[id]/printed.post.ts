import { createError } from "h3";
import { z } from "zod";
import { getPool } from "../../../db/pool";
import { requireUser } from "../../../modules/auth/session";
import { markSalePrintedFirst } from "../../../modules/sales/sales.service";
import { resolveStoreId } from "../../../modules/store/store-context";

const paramsSchema = z.object({ id: z.string().uuid() });

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const storeId = resolveStoreId(event, user);
  const params = paramsSchema.safeParse(event.context.params);
  if (!params.success)
    throw createError({ statusCode: 400, statusMessage: "Invalid params" });

  const printed_first_at = await markSalePrintedFirst({
    db: getPool(),
    storeId,
    saleId: params.data.id,
  });

  if (printed_first_at === null)
    throw createError({
      statusCode: 409,
      statusMessage:
        "Database belum di-migrate (kolom sales.printed_first_at belum ada). Jalankan: npm run db:migrate",
    });

  if (!printed_first_at)
    throw createError({ statusCode: 404, statusMessage: "Sale not found" });

  return { printed_first_at };
});
