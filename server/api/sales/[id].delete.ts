import { createError } from "h3";
import { z } from "zod";
import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { deleteSale } from "../../modules/sales/sales.service";
import { requireAdmin } from "../../utils/rbac";

const paramsSchema = z.object({ id: z.string().uuid() });

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const storeId = resolveStoreId(event, user);
  const params = paramsSchema.safeParse(event.context.params);
  if (!params.success)
    throw createError({ statusCode: 400, statusMessage: "Invalid params" });

  await deleteSale({ storeId, saleId: params.data.id });

  return { ok: true };
});
