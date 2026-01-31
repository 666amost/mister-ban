import { requireUser } from "../../../modules/auth/session";
import { resolveStoreId } from "../../../modules/store/store-context";
import { supplierInvoicesListQuerySchema } from "../../../modules/suppliers/supplier-invoices.schemas";
import { listSupplierInvoices } from "../../../modules/suppliers/supplier-invoices.service";
import { requireAdmin } from "../../../utils/rbac";
import { getQueryWithSchema } from "../../../utils/validate";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  requireAdmin(user);
  const storeId = resolveStoreId(event, user);
  const query = getQueryWithSchema(event, supplierInvoicesListQuerySchema);

  const items = await listSupplierInvoices({
    storeId,
    status: query.status,
    limit: query.limit ?? 50,
    offset: query.offset ?? 0,
  });

  return { items, limit: query.limit ?? 50, offset: query.offset ?? 0 };
});
