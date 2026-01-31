import { z } from "zod";

const optionalNonEmptyString: z.ZodType<
  string | undefined,
  z.ZodTypeDef,
  unknown
> = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value,
  z.string().trim().min(1).optional(),
);

export const inventoryListQuerySchema = z.object({
  q: optionalNonEmptyString,
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const inventoryAdjustBodySchema = z
  .object({
    product_id: z.string().uuid(),
    qty_delta: z.coerce.number().int(),
    unit_cost: z.coerce.number().int().min(0).optional(),
    note: z.string().trim().max(200).optional(),
  })
  .refine((v) => v.qty_delta !== 0, { message: "qty_delta must not be 0" });
