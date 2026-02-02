import { createError } from "h3";
import { z } from "zod";
import { getPool } from "../../../db/pool";
import { requireUser } from "../../../modules/auth/session";
import { hashPassword } from "../../../modules/auth/password";
import { storeExists } from "../../../modules/stores/stores.repo";
import { badRequest } from "../../../utils/http";
import { requireAdmin } from "../../../utils/rbac";
import { readBodyWithSchema } from "../../../utils/validate";

const bodySchema = z.object({
  email: z.string().email().max(100),
  password: z.string().min(6).max(100),
  role: z.enum(["ADMIN", "STAFF"]),
  store_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().default(true),
});

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const body = await readBodyWithSchema(event, bodySchema);

  const pool = getPool();

  const existingUser = await pool.query(
    "SELECT id FROM users WHERE email = $1 LIMIT 1",
    [body.email.toLowerCase()],
  );
  if (existingUser.rows[0]) {
    throw badRequest("Email sudah terdaftar");
  }

  const storeIdFinal = body.role === "ADMIN" ? null : body.store_id;
  if (body.role === "STAFF" && !storeIdFinal) {
    throw badRequest("STAFF wajib memilih store");
  }

  if (storeIdFinal) {
    const ok = await storeExists(pool, storeIdFinal);
    if (!ok) throw badRequest("Store tidak ditemukan");
  }

  const passwordHash = hashPassword(body.password);

  const result = await pool.query<{
    id: string;
    email: string;
    role: string;
    store_id: string | null;
    is_active: boolean;
    created_at: string;
  }>(
    `
      INSERT INTO users (email, password_hash, role, store_id, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, role, store_id, is_active, created_at
    `,
    [body.email.toLowerCase(), passwordHash, body.role, storeIdFinal, body.is_active],
  );

  const newUser = result.rows[0];
  if (!newUser) {
    throw createError({ statusCode: 500, statusMessage: "Gagal membuat user" });
  }

  let storeName: string | null = null;
  if (newUser.store_id) {
    const storeRes = await pool.query<{ name: string }>(
      "SELECT name FROM stores WHERE id = $1",
      [newUser.store_id],
    );
    storeName = storeRes.rows[0]?.name ?? null;
  }

  return {
    item: {
      ...newUser,
      store_name: storeName,
    },
  };
});
