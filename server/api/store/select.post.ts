import { createError } from "h3";
import { z } from "zod";
import { getPool } from "../../db/pool";
import { requireUser } from "../../modules/auth/session";
import { storeExists } from "../../modules/stores/stores.repo";
import { setAdminStoreCookie } from "../../modules/store/store-context";
import { forbidden } from "../../utils/http";
import { readBodyWithSchema } from "../../utils/validate";

const schema = z.object({ store_id: z.string().uuid() });

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  
  if (user.role === "STAFF") throw forbidden();

  const body = await readBodyWithSchema(event, schema);

  const ok = await storeExists(getPool(), body.store_id);
  if (!ok)
    throw createError({ statusCode: 404, statusMessage: "Store not found" });

  setAdminStoreCookie(event, body.store_id);
  return { ok: true };
});
