import type { H3Event } from "h3";
import { getQuery } from "h3";
import { getCookie, setCookie } from "h3";
import { forbidden } from "../../utils/http";
import type { AuthUser } from "../auth/session";

const STORE_COOKIE = "mb_store_id";

export function resolveStoreId(event: H3Event, user: AuthUser) {
  if (user.role === "STAFF") {
    if (!user.store_id) throw forbidden("User STAFF tidak punya store_id");
    return user.store_id;
  }

  const header = event.node.req.headers["x-store-id"];
  if (typeof header === "string" && header.length > 0) return header;

  const queryStoreId = getQuery(event).store_id;
  if (typeof queryStoreId === "string" && queryStoreId.length > 0)
    return queryStoreId;

  const cookieStoreId = getCookie(event, STORE_COOKIE);
  if (cookieStoreId) return cookieStoreId;

  throw forbidden("Admin harus memilih store_id");
}

export function setAdminStoreCookie(event: H3Event, storeId: string) {
  setCookie(event, STORE_COOKIE, storeId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}
