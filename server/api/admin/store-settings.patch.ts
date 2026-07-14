import { z } from "zod";
import { getPool } from "../../db/pool";
import { requireUser } from "../../modules/auth/session";
import { resolveStoreId } from "../../modules/store/store-context";
import { requireAdmin } from "../../utils/rbac";
import { readBodyWithSchema } from "../../utils/validate";

const schema = z.object({
  name: z.string().trim().min(1, "Nama toko wajib diisi").max(100),
  receipt_instagram_mode: z.enum(["default", "custom", "hidden"]),
  receipt_instagram: z.string().trim().max(100).nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.receipt_instagram_mode === "custom" && !value.receipt_instagram) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["receipt_instagram"], message: "Instagram custom wajib diisi" });
  }
});

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);
  const storeId = resolveStoreId(event, user);
  const body = await readBodyWithSchema(event, schema);
  const instagram = body.receipt_instagram_mode === "custom"
    ? body.receipt_instagram!.replace(/^\s*@?/, "@")
    : null;
  const { rows } = await getPool().query(
    `UPDATE stores SET name = $2, receipt_instagram_mode = $3, receipt_instagram = $4
     WHERE id = $1
     RETURNING id, name, code, address, city, operating_hours, status,
       receipt_instagram_mode, receipt_instagram`,
    [storeId, body.name, body.receipt_instagram_mode, instagram],
  );
  if (!rows[0]) throw createError({ statusCode: 404, statusMessage: "Toko tidak ditemukan" });
  return { store: rows[0] };
});
