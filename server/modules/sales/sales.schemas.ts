import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const saleItemSchema = z.object({
  product_id: z.string().uuid(),
  qty: z.coerce.number().int().positive(),
});

const customItemSchema = z.object({
  item_name: z.string().trim().min(1).max(100),
  qty: z.coerce.number().int().positive(),
  price: z.coerce.number().int().min(0),
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
    items: z.array(saleItemSchema).default([]),
    custom_items: z.array(customItemSchema).default([]),
    discount: z.coerce.number().int().min(0).default(0),
    service_fee: z.coerce.number().int().min(0).default(0),
  })
  .superRefine((data, ctx) => {
    if (data.items.length === 0 && data.custom_items.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "Minimal 1 item produk atau custom item",
      });
      return;
    }
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
  all_dates: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  q: z.string().trim().min(1).max(100).optional(),
});

const updateSaleItemSchema = z.object({
  product_id: z.string().uuid(),
  qty: z.coerce.number().int().positive(),
});

const updateCustomItemSchema = z.object({
  item_name: z.string().trim().min(1).max(100),
  qty: z.coerce.number().int().positive(),
  price: z.coerce.number().int().min(0),
});

export const updateSaleBodySchema = z
  .object({
    payment_type: z
      .enum(["CASH", "TRANSFER", "QRIS", "DEBIT", "CREDIT", "TEMPO"])
      .optional(),
    plate_no: z.string().trim().min(1).max(20).optional(),
    discount: z.coerce.number().int().min(0).optional(),
    service_fee: z.coerce.number().int().min(0).optional(),
    items: z.array(updateSaleItemSchema).optional(),
    custom_items: z.array(updateCustomItemSchema).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No fields to update",
  });
