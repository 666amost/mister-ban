import { requireUser } from "../../../modules/auth/session";
import { resolveStoreId } from "../../../modules/store/store-context";
import { createSupplierInvoiceBodySchema } from "../../../modules/suppliers/supplier-invoices.schemas";
import { createSupplierInvoice } from "../../../modules/suppliers/supplier-invoices.service";
import { requireAdmin } from "../../../utils/rbac";
import { readBodyWithSchema } from "../../../utils/validate";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);

  const storeId = resolveStoreId(event, user);
  const body = await readBodyWithSchema(event, createSupplierInvoiceBodySchema);

  return await createSupplierInvoice({
    storeId,
    userId: user.id,
    supplierName: body.supplier_name,
    invoiceNo: body.invoice_no,
    invoiceDate: body.invoice_date ?? todayIsoDate(),
    dueDate: body.due_date,
    items: body.items,
  });
});
