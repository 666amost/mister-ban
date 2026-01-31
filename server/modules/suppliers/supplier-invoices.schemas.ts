import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const invoiceItemSchema = z.object({
  product_id: z.string().uuid(),
  qty: z.coerce.number().int().positive(),
  unit_cost: z.coerce.number().int().min(0),
});

export const createSupplierInvoiceBodySchema = z
  .object({
    supplier_name: z.string().trim().min(1),
    invoice_no: z.string().trim().min(1),
    invoice_date: dateSchema.optional(),
    due_date: dateSchema.optional(),
    items: z.array(invoiceItemSchema).min(1),
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

export const supplierInvoicesListQuerySchema = z.object({
  status: z.enum(["OPEN", "PARTIAL", "PAID", "VOID"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const createSupplierPaymentBodySchema = z.object({
  paid_at: dateSchema.optional(),
  amount: z.coerce.number().int().positive(),
  payment_method: z.string().trim().min(1),
  note: z.string().trim().max(200).optional(),
});
