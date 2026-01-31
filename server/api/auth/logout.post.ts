import { getCookie } from "h3";
import {
  clearSessionCookie,
  deleteSessionByToken,
} from "../../modules/auth/session";

export default defineEventHandler(async (event) => {
  const token = getCookie(event, "mb_session");
  if (token) await deleteSessionByToken(token);
  clearSessionCookie(event);
  return { ok: true };
});
