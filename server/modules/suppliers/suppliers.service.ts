import { getPool } from "../../db/pool";
import { badRequest } from "../../utils/http";

export async function listSuppliers({
  q,
  limit,
  offset,
}: {
  q?: string;
  limit: number;
  offset: number;
}) {
  const { rows } = await getPool().query(
    `
      SELECT id, name, phone, created_at
      FROM suppliers
      WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%')
      ORDER BY name ASC
      LIMIT $2
      OFFSET $3
    `,
    [q ?? null, limit, offset],
  );

  return rows as Array<{
    id: string;
    name: string;
    phone: string | null;
    created_at: string;
  }>;
}

export async function createSupplier({
  name,
  phone,
}: {
  name: string;
  phone?: string | null;
}) {
  try {
    const { rows } = await getPool().query(
      `
        INSERT INTO suppliers (name, phone)
        VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE SET
          phone = COALESCE(EXCLUDED.phone, suppliers.phone)
        RETURNING id, name, phone, created_at
      `,
      [name.trim(), phone ?? null],
    );
    return rows[0] as {
      id: string;
      name: string;
      phone: string | null;
      created_at: string;
    };
  } catch {
    throw badRequest("Gagal menambah supplier");
  }
}

export async function updateSupplier({
  supplierId,
  name,
  phone,
}: {
  supplierId: string;
  name?: string;
  phone?: string | null;
}) {
  try {
    const nameProvided = name !== undefined;
    const phoneProvided = phone !== undefined;
    const { rows } = await getPool().query(
      `
        UPDATE suppliers
        SET
          name = CASE WHEN $2::bool THEN $3 ELSE name END,
          phone = CASE WHEN $4::bool THEN $5 ELSE phone END
        WHERE id = $1
        RETURNING id, name, phone, created_at
      `,
      [
        supplierId,
        nameProvided,
        nameProvided ? name.trim() : null,
        phoneProvided,
        phoneProvided ? phone ?? null : null,
      ],
    );
    const row = rows[0];
    if (!row) throw badRequest("Supplier tidak ditemukan");
    return row as {
      id: string;
      name: string;
      phone: string | null;
      created_at: string;
    };
  } catch (error) {
    // Unique constraint on name can throw; keep message generic.
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    throw badRequest("Gagal update supplier");
  }
}
