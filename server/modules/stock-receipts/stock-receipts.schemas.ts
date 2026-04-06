import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const optionalNonEmptyString: z.ZodType<string | undefined, z.ZodTypeDef, unknown> = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value,
  z.string().trim().min(1).optional(),
);

const stockReceiptItemSchema = z.object({
  item_name: z.string().trim().min(1).max(100),
  qty: z.coerce.number().int().positive(),
  unit_label: z.string().trim().min(1).max(20).default("pcs"),
});

export const createStockReceiptBodySchema = z.object({
  receipt_date: dateSchema.optional(),
  items: z.array(stockReceiptItemSchema).min(1).max(50),
});

export const stockReceiptsListQuerySchema = z.object({
  date: dateSchema.optional(),
  all_dates: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  q: optionalNonEmptyString,
});

export const deleteStockReceiptQuerySchema = z.object({
  id: z.string().uuid(),
});