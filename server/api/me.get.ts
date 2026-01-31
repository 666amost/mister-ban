import { requireUser } from "../modules/auth/session";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  return { user };
});
