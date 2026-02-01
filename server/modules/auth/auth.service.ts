import { z } from "zod";
import { tx } from "../../db/db";
import { badRequest, unauthorized } from "../../utils/http";
import { verifyPassword } from "./password";
import { createSession } from "./session";

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function login(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return await tx(async (client) => {
    const { rows } = await client.query(
      "SELECT id, email, password_hash, role, store_id, is_active FROM users WHERE lower(email) = lower($1) LIMIT 1",
      [normalizedEmail],
    );
    const user = rows[0];
    if (!user || user.is_active !== true)
      throw unauthorized("Email atau password salah");
    if (!verifyPassword(password, user.password_hash))
      throw unauthorized("Email atau password salah");

    if (user.role === "STAFF" && !user.store_id)
      throw badRequest("User STAFF wajib punya store_id");

    const session = await createSession(client, user.id);
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        store_id: user.store_id ?? null,
      },
      session,
    };
  });
}
