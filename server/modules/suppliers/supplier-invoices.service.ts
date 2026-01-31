import type { DbConn } from "../../db/conn";
import { getPool } from "../../db/pool";
import { tx } from "../../db/db";
import { badRequest } from "../../utils/http";
import { ensureBalances, lockBalances } from "../inventory/inventory.repo";
import { buildValuesPlaceholders } from "../../utils/sql";

type InvoiceItemInput = { product_id: string; qty: number; unit_cost: number };

async function upsertSupplier(db: DbConn, name: string) {
  const { rows } = await db.query<{ id: string }>(
    `
      INSERT INTO suppliers (name)
      VALUES ($1)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `,
    [name.trim()],
  );
  return rows[0]?.id as string;
}

export async function createSupplierInvoice({
  storeId,
  userId,
  supplierName,
  invoiceNo,
  invoiceDate,
  dueDate,
  items,
}: {
  storeId: string;
  userId: string;
  supplierName: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string;
  items: InvoiceItemInput[];
}) {
  return await tx(async (client) => {
    const supplierId = await upsertSupplier(client, supplierName);
    if (!supplierId) throw badRequest("Supplier gagal dibuat");

    const productIds = items.map((i) => i.product_id);
    await ensureBalances(client, storeId, productIds);
    await lockBalances(client, storeId, productIds);

    const totalAmount = items.reduce((sum, i) => sum + i.qty * i.unit_cost, 0);

    const invoiceRes = await client.query<{ id: string }>(
      `
        INSERT INTO supplier_invoices (
          store_id, supplier_id, invoice_no, invoice_date, due_date, total_amount, status, created_by
        )
        VALUES ($1, $2, $3, $4::date, $5::date, $6, 'OPEN', $7)
        RETURNING id
      `,
      [
        storeId,
        supplierId,
        invoiceNo,
        invoiceDate,
        dueDate ?? null,
        totalAmount,
        userId,
      ],
    );
    const invoiceId = invoiceRes.rows[0]?.id;
    if (!invoiceId) throw badRequest("Gagal membuat invoice");

    const invoiceItemRows = items.map((i) => [
      invoiceId,
      i.product_id,
      i.qty,
      i.unit_cost,
      i.qty * i.unit_cost,
    ]);
    const ii = buildValuesPlaceholders(invoiceItemRows);
    await client.query(
      `
        INSERT INTO supplier_invoice_items (supplier_invoice_id, product_id, qty, unit_cost, line_total)
        VALUES ${ii.placeholders}
      `,
      ii.values,
    );

    const updateRows = items.map((i) => [i.product_id, i.qty, i.unit_cost]);
    const upd = buildValuesPlaceholders(updateRows, 2);
    await client.query(
      `
        UPDATE inventory_balances ib
        SET
          qty_on_hand = ib.qty_on_hand + v.qty::int,
          avg_unit_cost = (
            (
              (ib.qty_on_hand::bigint * ib.avg_unit_cost::bigint)
              + (v.qty::bigint * v.unit_cost::bigint)
              + ((ib.qty_on_hand::bigint + v.qty::bigint) / 2)
            ) / (ib.qty_on_hand::bigint + v.qty::bigint)
          )::int,
          updated_at = now()
        FROM (VALUES ${upd.placeholders}) AS v(product_id, qty, unit_cost)
        WHERE ib.store_id = $1
          AND ib.product_id = v.product_id::uuid
      `,
      [storeId, ...upd.values],
    );

    const ledgerRows = items.map((i) => [
      storeId,
      i.product_id,
      "IN",
      i.qty,
      i.unit_cost,
      "SUPPLIER_INVOICE",
      invoiceId,
      null,
      invoiceDate,
      userId,
    ]);
    const led = buildValuesPlaceholders(ledgerRows);
    await client.query(
      `
        INSERT INTO inventory_ledger (
          store_id, product_id, txn_type, qty_delta, unit_cost, ref_type, ref_id, note, txn_at, created_by
        )
        SELECT
          v.store_id::uuid,
          v.product_id::uuid,
          v.txn_type,
          v.qty_delta::int,
          v.unit_cost::int,
          v.ref_type,
          v.ref_id::uuid,
          v.note,
          v.txn_at::timestamptz,
          v.created_by::uuid
        FROM (VALUES ${led.placeholders}) AS v(
          store_id,
          product_id,
          txn_type,
          qty_delta,
          unit_cost,
          ref_type,
          ref_id,
          note,
          txn_at,
          created_by
        )
      `,
      led.values,
    );

    return { invoice_id: invoiceId };
  });
}

export async function listSupplierInvoices({
  storeId,
  status,
  limit,
  offset,
}: {
  storeId: string;
  status?: string;
  limit: number;
  offset: number;
}) {
  const { rows } = await getPool().query(
    `
      WITH paid AS (
        SELECT supplier_invoice_id, COALESCE(SUM(amount), 0)::int AS paid_amount
        FROM supplier_payments
        GROUP BY supplier_invoice_id
      )
      SELECT
        si.id,
        si.invoice_no,
        si.invoice_date,
        si.due_date,
        si.total_amount,
        si.status,
        s.name AS supplier_name,
        COALESCE(paid.paid_amount, 0) AS paid_amount,
        (si.total_amount - COALESCE(paid.paid_amount, 0)) AS remaining
      FROM supplier_invoices si
      JOIN suppliers s ON s.id = si.supplier_id
      LEFT JOIN paid ON paid.supplier_invoice_id = si.id
      WHERE si.store_id = $1
        AND ($2::text IS NULL OR si.status = $2)
      ORDER BY si.invoice_date DESC, si.created_at DESC
      LIMIT $3
      OFFSET $4
    `,
    [storeId, status ?? null, limit, offset],
  );
  return rows;
}

export async function addSupplierPayment({
  storeId,
  userId,
  invoiceId,
  paidAt,
  amount,
  paymentMethod,
  note,
}: {
  storeId: string;
  userId: string;
  invoiceId: string;
  paidAt: string;
  amount: number;
  paymentMethod: string;
  note?: string;
}) {
  return await tx(async (client) => {
    const invoiceRes = await client.query<{
      total_amount: number;
      status: string;
    }>(
      `
        SELECT total_amount, status
        FROM supplier_invoices
        WHERE id = $1
          AND store_id = $2
        FOR UPDATE
      `,
      [invoiceId, storeId],
    );
    const invoice = invoiceRes.rows[0];
    if (!invoice) throw badRequest("Invoice tidak ditemukan");
    if (invoice.status === "VOID")
      throw badRequest("Invoice VOID tidak bisa dibayar");

    await client.query(
      `
        INSERT INTO supplier_payments (supplier_invoice_id, paid_at, amount, payment_method, note, created_by)
        VALUES ($1, $2::date, $3, $4, $5, $6)
      `,
      [invoiceId, paidAt, amount, paymentMethod, note ?? null, userId],
    );

    const paidRes = await client.query<{ paid_amount: number }>(
      "SELECT COALESCE(SUM(amount), 0)::int AS paid_amount FROM supplier_payments WHERE supplier_invoice_id = $1",
      [invoiceId],
    );
    const paidAmount = paidRes.rows[0]?.paid_amount ?? 0;

    let status: "OPEN" | "PARTIAL" | "PAID" = "OPEN";
    if (paidAmount >= invoice.total_amount) status = "PAID";
    else if (paidAmount > 0) status = "PARTIAL";

    await client.query(
      "UPDATE supplier_invoices SET status = $2 WHERE id = $1",
      [invoiceId, status],
    );

    return {
      invoice_id: invoiceId,
      status,
      paid_amount: paidAmount,
      remaining: invoice.total_amount - paidAmount,
    };
  });
}
