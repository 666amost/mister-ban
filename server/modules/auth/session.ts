import crypto from "node:crypto";
import type { H3Event } from "h3";
import { getCookie, deleteCookie, setCookie } from "h3";
import type { PoolClient } from "@neondatabase/serverless";
import { getPool } from "../../db/pool";
import { unauthorized } from "../../utils/http";

export type AuthUser = {
  id: string;
  email: string;
  role: "ADMIN" | "STAFF";
  store_id: string | null;
};

const SESSION_COOKIE = "mb_session";

function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE, { path: "/" });
}

export function setSessionCookie(
  event: H3Event,
  token: string,
  maxAgeSeconds: number,
) {
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
    expires: expiresAt,
  });
}

export async function createSession(
  client: PoolClient,
  userId: string,
  ttlDays = 30,
) {
  const token = crypto.randomBytes(32).toString("base64url");
  const hash = tokenHash(token);
  const maxAgeSeconds = ttlDays * 24 * 60 * 60;
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);

  await client.query(
    `
      INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
    `,
    [userId, hash, expiresAt],
  );

  return { token, maxAgeSeconds };
}

export async function deleteSessionByToken(token: string) {
  const hash = tokenHash(token);
  await getPool().query("DELETE FROM sessions WHERE token_hash = $1", [hash]);
}

export async function getUserFromRequest(
  event: H3Event,
): Promise<AuthUser | null> {
  const token = getCookie(event, SESSION_COOKIE);
  if (!token) return null;
  const hash = tokenHash(token);
  const { rows } = await getPool().query(
    `
      SELECT u.id, u.email, u.role, u.store_id
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > now()
        AND u.is_active = true
      LIMIT 1
    `,
    [hash],
  );
  return (rows[0] as AuthUser | undefined) ?? null;
}

export async function requireUser(event: H3Event) {
  const user = await getUserFromRequest(event);
  if (!user) throw unauthorized();
  return user;
}
