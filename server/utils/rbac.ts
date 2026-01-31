import { forbidden } from "./http";
import type { AuthUser } from "../modules/auth/session";

export function requireAdmin(user: AuthUser) {
  if (user.role !== "ADMIN") throw forbidden();
}
