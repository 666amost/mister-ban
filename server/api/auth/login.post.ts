import { createError, readBody } from "h3";
import { login, loginBodySchema } from "../../modules/auth/auth.service";
import { setSessionCookie } from "../../modules/auth/session";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = loginBodySchema.safeParse(body);
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid body" });
  }

  const result = await login(parsed.data.email, parsed.data.password);
  setSessionCookie(event, result.session.token, result.session.maxAgeSeconds);

  return { user: result.user };
});
