import { getPool } from "../../../db/pool";
import { requireUser } from "../../../modules/auth/session";
import { requireAdmin } from "../../../utils/rbac";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const { rows } = await getPool().query(
    `
      SELECT
        u.id,
        u.email,
        u.role,
        u.store_id,
        s.name AS store_name,
        u.is_active,
        u.created_at
      FROM users u
      LEFT JOIN stores s ON s.id = u.store_id
      ORDER BY u.role DESC, u.email ASC
    `,
  );

  return { items: rows };
});

