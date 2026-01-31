import { z } from "zod";

export const suppliersListQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const createSupplierBodySchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().max(30).nullable().optional(),
});

export const updateSupplierBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    phone: z.string().trim().max(30).nullable().optional(),
  })
  .refine((v) => v.name !== undefined || v.phone !== undefined, {
    message: "At least one field is required",
  });
