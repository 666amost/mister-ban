import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const saleItemSchema = z.object({
  product_id: z.string().uuid(),
  qty: z.coerce.number().int().positive(),
});

export const createSaleBodySchema = z
  .object({
    sale_date: dateSchema.optional(),
    payment_type: z.enum([
      "CASH",
      "TRANSFER",
      "QRIS",
      "DEBIT",
      "CREDIT",
      "TEMPO",
    ]),
    plate_no: z.string().trim().min(1).max(20),
    items: z.array(saleItemSchema).min(1),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    for (const item of data.items) {
      if (seen.has(item.product_id)) {
        ctx.addIssue({
          code: "custom",
          path: ["items"],
          message: "Duplicate product_id",
        });
        return;
      }
      seen.add(item.product_id);
    }
  });

export const salesListQuerySchema = z.object({
  date: dateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
