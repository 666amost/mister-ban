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

export const productListQuerySchema = z.object({
  q: optionalNonEmptyString,
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const createProductBodySchema = z.object({
  brand: z.string().trim().min(1),
  product_type: z.string().trim().min(1),
  name: z.string().trim().min(1),
  size: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  sell_price: z.coerce.number().int().min(0),
  initial_qty: z.coerce.number().int().min(0).default(0),
  initial_unit_cost: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().optional().default(true),
});

export const updateStoreProductBodySchema = z.object({
  sell_price: z.coerce.number().int().min(0),
  is_active: z.boolean().optional(),
});
