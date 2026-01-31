import { createError } from "h3";
import { z } from "zod";
import { tx } from "../../../db/db";
import { requireUser } from "../../../modules/auth/session";
import { storeExists } from "../../../modules/stores/stores.repo";
import { badRequest } from "../../../utils/http";
import { requireAdmin } from "../../../utils/rbac";
import { readBodyWithSchema } from "../../../utils/validate";

const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.object({
  role: z.enum(["ADMIN", "STAFF"]).optional(),
  store_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const params = paramsSchema.safeParse(event.context.params);
  if (!params.success)
    throw createError({ statusCode: 400, statusMessage: "Invalid params" });

  const body = await readBodyWithSchema(event, bodySchema);

  const updated = await tx(async (client) => {
    const res = await client.query<{
      role: string;
      store_id: string | null;
      is_active: boolean;
    }>(
      "SELECT role, store_id, is_active FROM users WHERE id = $1 FOR UPDATE",
      [params.data.id],
    );
    const current = res.rows[0];
    if (!current) throw badRequest("User tidak ditemukan");

    const nextRole = body.role ?? (current.role as "ADMIN" | "STAFF");
    const nextStoreId =
      body.store_id !== undefined ? body.store_id : current.store_id;
    const nextIsActive =
      body.is_active !== undefined ? body.is_active : current.is_active;

    const storeIdFinal = nextRole === "ADMIN" ? null : nextStoreId;
    if (nextRole === "STAFF" && !storeIdFinal)
      throw badRequest("STAFF wajib punya store");

    if (storeIdFinal) {
      const ok = await storeExists(client, storeIdFinal);
      if (!ok) throw badRequest("Store tidak ditemukan");
    }

    const upd = await client.query(
      `
        UPDATE users
        SET role = $2,
            store_id = $3,
            is_active = $4
        WHERE id = $1
        RETURNING id, email, role, store_id, is_active
      `,
      [params.data.id, nextRole, storeIdFinal, nextIsActive],
    );
    return upd.rows[0] ?? null;
  });

  return { item: updated };
});
