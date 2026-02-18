import { createError } from "h3";
import { z } from "zod";
import { tx } from "../../../db/db";
import { requireUser } from "../../../modules/auth/session";
import { badRequest } from "../../../utils/http";
import { requireAdmin } from "../../../utils/rbac";

const paramsSchema = z.object({ id: z.string().uuid() });

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const params = paramsSchema.safeParse(event.context.params);
  if (!params.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid params" });
  }

  if (params.data.id === user.id) {
    throw badRequest("Tidak bisa menghapus akun sendiri");
  }

  const deleted = await tx(async (client) => {
    const existing = await client.query<{ id: string }>(
      "SELECT id FROM users WHERE id = $1 FOR UPDATE",
      [params.data.id],
    );
    if (!existing.rows[0]) {
      throw badRequest("User tidak ditemukan");
    }

    const res = await client.query<{ id: string }>(
      "DELETE FROM users WHERE id = $1 RETURNING id",
      [params.data.id],
    );
    return res.rows[0] ?? null;
  });

  return { item: deleted };
});
