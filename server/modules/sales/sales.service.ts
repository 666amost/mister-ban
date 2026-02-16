import { tx } from "../../db/db";
import { badRequest } from "../../utils/http";
import { ensureBalances, lockBalances } from "../inventory/inventory.repo";
import type { DbConn } from "../../db/conn";
import { buildValuesPlaceholders } from "../../utils/sql";

type SaleItemInput = { product_id: string; qty: number };
type CustomItemInput = { item_name: string; qty: number; price: number };
type SalePaymentInput = { payment_type: string; amount: number };
type SaleExpenseInput = { item_name: string; amount: number };

let printedFirstAtColumnSupported: boolean | null = null;

async function hasPrintedFirstAtColumn(db: DbConn) {
  if (printedFirstAtColumnSupported !== null) return printedFirstAtColumnSupported;
  const res = await db.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sales'
        AND column_name = 'printed_first_at'
      LIMIT 1
    `,
  );
  printedFirstAtColumnSupported = res.rows.length > 0;
  return printedFirstAtColumnSupported;
}

type PricedItem = {
  product_id: string;
  qty: number;
  sell_price: number;
  unit_cost: number;
  profit: number;
  line_total: number;
};

async function getSellPrices(
  db: DbConn,
  storeId: string,
  productIds: string[],
) {
  const { rows } = await db.query<{ product_id: string; sell_price: number }>(
    `
      SELECT product_id, sell_price
      FROM store_products
      WHERE store_id = $1
        AND product_id = ANY($2::uuid[])
        AND status = 'active'
    `,
    [storeId, productIds],
  );
  return rows;
}

function normalizeSalePayments({
  paymentType,
  payments,
  total,
}: {
  paymentType?: string;
  payments?: SalePaymentInput[];
  total: number;
}) {
  const trimmedPayments = payments?.filter((p) => p && p.amount && p.amount > 0) ?? [];

  if (trimmedPayments.length > 0) {
    const seen = new Set<string>();
    for (const p of trimmedPayments) {
      if (seen.has(p.payment_type)) throw badRequest("Duplicate payment_type");
      seen.add(p.payment_type);
    }

    if (trimmedPayments.length === 1) {
      const single = trimmedPayments[0];
      if (!single) throw badRequest("Pembayaran tidak valid");
      return {
        paymentTypeSummary: single.payment_type,
        paymentRows: [{ payment_type: single.payment_type, amount: total }],
      };
    }

    const sum = trimmedPayments.reduce((acc, p) => acc + p.amount, 0);
    if (sum !== total) {
      throw badRequest("Total pembayaran harus sama dengan total transaksi");
    }
    return { paymentTypeSummary: "MIXED", paymentRows: trimmedPayments };
  }

  if (!paymentType) throw badRequest("Metode pembayaran wajib diisi");
  return {
    paymentTypeSummary: paymentType,
    paymentRows: [{ payment_type: paymentType, amount: total }],
  };
}

export async function createSale({
  storeId,
  userId,
  saleDate,
  paymentType,
  payments,
  plateNo,
  items,
  customItems,
  discount,
  serviceFee,
  expenses,
  expenseOnly,
}: {
  storeId: string;
  userId: string;
  saleDate: string;
  paymentType?: string;
  payments?: SalePaymentInput[];
  plateNo: string;
  items: SaleItemInput[];
  customItems: CustomItemInput[];
  discount: number;
  serviceFee: number;
  expenses?: SaleExpenseInput[];
  expenseOnly?: boolean;
}) {
  return await tx(async (client) => {
    const productIds = items.map((i) => i.product_id);

    await ensureBalances(client, storeId, productIds);
    const balances = await lockBalances(client, storeId, productIds);
    const balanceById = new Map(balances.map((b) => [b.product_id, b]));

    const priceRows = await getSellPrices(client, storeId, productIds);
    const sellPriceById = new Map(
      priceRows.map((r) => [r.product_id, r.sell_price]),
    );

    const priced: PricedItem[] = items.map((item) => {
      const bal = balanceById.get(item.product_id);
      const sellPrice = sellPriceById.get(item.product_id);
      if (!sellPrice) throw badRequest("Produk tidak aktif di toko ini");
      if (!bal) throw badRequest("Inventory balance tidak ditemukan");
      if (bal.qty_on_hand < item.qty) throw badRequest("Stok tidak cukup");

      const unitCost = bal.avg_unit_cost;
      const lineTotal = sellPrice * item.qty;
      const profit = (sellPrice - unitCost) * item.qty;

      return {
        product_id: item.product_id,
        qty: item.qty,
        sell_price: sellPrice,
        unit_cost: unitCost,
        profit,
        line_total: lineTotal,
      };
    });

    if (!expenseOnly) {
      await client.query(
        "INSERT INTO customers (store_id, plate_no) VALUES ($1, $2) ON CONFLICT (store_id, plate_no) DO NOTHING",
        [storeId, plateNo],
      );
    }

    const productSubtotal = priced.reduce((sum, i) => sum + i.line_total, 0);
    const customSubtotal = customItems.reduce((sum, i) => sum + i.qty * i.price, 0);
    const subtotal = productSubtotal + customSubtotal;
    const total = subtotal - discount + serviceFee;

    const normalizedPayments = expenseOnly
      ? {
          paymentTypeSummary: "CASH",
          paymentRows: [],
        }
      : normalizeSalePayments({
          paymentType,
          payments,
          total,
        });

    const saleRes = await client.query<{ id: string; created_at: string }>(
      `
        INSERT INTO sales (store_id, sale_date, payment_type, customer_plate_no, subtotal, total, discount, service_fee, created_by)
        VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, created_at
      `,
      [storeId, saleDate, normalizedPayments.paymentTypeSummary, plateNo, subtotal, total, discount, serviceFee, userId],
    );
    const saleId = saleRes.rows[0]?.id;
    if (!saleId) throw badRequest("Gagal membuat sales");

    if (normalizedPayments.paymentRows.length > 0) {
      const paymentRows = normalizedPayments.paymentRows.map((p) => [
        saleId,
        p.payment_type,
        p.amount,
        userId,
      ]);
      const pay = buildValuesPlaceholders(paymentRows);
      await client.query(
        `
          INSERT INTO sales_payments (sale_id, payment_type, amount, created_by)
          VALUES ${pay.placeholders}
        `,
        pay.values,
      );
    }

    if ((expenses ?? []).length > 0) {
      const expenseRows = (expenses ?? []).map((e) => [
        saleId,
        e.item_name,
        e.amount,
        userId,
      ]);
      const exp = buildValuesPlaceholders(expenseRows);
      await client.query(
        `
          INSERT INTO sales_expenses (sale_id, item_name, amount, created_by)
          VALUES ${exp.placeholders}
        `,
        exp.values,
      );
    }

    if (priced.length > 0) {
      const salesItemRows = priced.map((i) => [
        saleId,
        i.product_id,
        i.qty,
        i.sell_price,
        i.unit_cost,
        i.profit,
        i.line_total,
      ]);
      const si = buildValuesPlaceholders(salesItemRows);
      await client.query(
        `
          INSERT INTO sales_items (sale_id, product_id, qty, sell_price, unit_cost, profit, line_total)
          VALUES ${si.placeholders}
        `,
        si.values,
      );
    }

    if (customItems.length > 0) {
      const customItemRows = customItems.map((i) => [
        saleId,
        i.item_name,
        i.qty,
        i.price,
        i.qty * i.price,
      ]);
      const ci = buildValuesPlaceholders(customItemRows);
      await client.query(
        `
          INSERT INTO sales_custom_items (sale_id, item_name, qty, price, line_total)
          VALUES ${ci.placeholders}
        `,
        ci.values,
      );
    }

    if (priced.length > 0) {
      const updateRows = priced.map((i) => [i.product_id, -i.qty]);
      const upd = buildValuesPlaceholders(updateRows, 2);
      await client.query(
        `
          UPDATE inventory_balances ib
          SET qty_on_hand = ib.qty_on_hand + v.qty_delta::int,
              updated_at = now()
          FROM (VALUES ${upd.placeholders}) AS v(product_id, qty_delta)
          WHERE ib.store_id = $1
            AND ib.product_id = v.product_id::uuid
        `,
        [storeId, ...upd.values],
      );

      const ledgerRows = priced.map((i) => [
        storeId,
        i.product_id,
        "OUT",
        -i.qty,
        i.unit_cost,
        "SALE",
        saleId,
        null,
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
            now(),
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
            created_by
          )
        `,
        led.values,
      );
    }

    return { sale_id: saleId };
  });
}

export type SalesQtySummary = {
  ban_qty: number;
  oli_qty: number;
  kampas_qty: number;
  total_qty: number;
};

export async function getSalesQtySummary({
  db,
  storeId,
  date,
  allDates,
}: {
  db: DbConn;
  storeId: string;
  date: string;
  allDates?: boolean;
}): Promise<SalesQtySummary> {
  const params: Array<string> = [storeId];
  let dateFilter = "";
  if (!allDates) {
    dateFilter = "AND s.sale_date = $2::date";
    params.push(date);
  }

  const { rows } = await db.query<SalesQtySummary>(
    `
      SELECT
        COALESCE(SUM(CASE
          WHEN UPPER(TRIM(p.product_type)) = 'BAN'
               AND LOWER(TRIM(b.name)) NOT IN ('ban dalam', 'oli', 'disc pad', 'disc', 'iml', 'cairan')
               AND LOWER(p.name) NOT LIKE '%ban dalam%'
               AND LOWER(p.name) NOT LIKE '%tube%'
          THEN si.qty ELSE 0
        END), 0)::int AS ban_qty,
        COALESCE(SUM(CASE
          WHEN LOWER(TRIM(b.name)) = 'oli'
               OR UPPER(TRIM(p.product_type)) = 'OLI'
          THEN si.qty ELSE 0
        END), 0)::int AS oli_qty,
        COALESCE(SUM(CASE
          WHEN LOWER(TRIM(b.name)) IN ('disc pad', 'disc')
               OR UPPER(TRIM(p.product_type)) = 'SPAREPART'
          THEN si.qty ELSE 0
        END), 0)::int AS kampas_qty,
        COALESCE(SUM(si.qty), 0)::int AS total_qty
      FROM sales_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      JOIN brands b ON b.id = p.brand_id
      WHERE s.store_id = $1
        ${dateFilter}
    `,
    params,
  );

  return rows[0] ?? { ban_qty: 0, oli_qty: 0, kampas_qty: 0, total_qty: 0 };
}

export async function listSales({
  db,
  storeId,
  date,
  allDates,
  hideExpenseOnly,
  q,
  limit,
  offset,
}: {
  db: DbConn;
  storeId: string;
  date: string;
  allDates?: boolean;
  hideExpenseOnly?: boolean;
  q?: string;
  limit: number;
  offset: number;
}) {
  const hasPrinted = await hasPrintedFirstAtColumn(db);
  const search = q?.trim() || null;

  const params: Array<string | number | boolean | null> = [storeId];
  let nextParam = 2;

  let dateFilter = "";
  if (!allDates) {
    dateFilter = `AND s.sale_date = $${nextParam}::date`;
    params.push(date);
    nextParam += 1;
  }

  const searchParam = nextParam;
  params.push(search);
  nextParam += 1;

  const hideExpenseOnlyParam = nextParam;
  params.push(hideExpenseOnly === true);
  nextParam += 1;

  const limitParam = nextParam;
  params.push(limit);
  nextParam += 1;

  const offsetParam = nextParam;
  params.push(offset);
  nextParam += 1;

  const sql = `
    SELECT
      s.id,
      s.sale_date,
      s.payment_type,
      s.customer_plate_no,
      s.subtotal,
      s.discount,
      s.service_fee,
      s.total,
      s.created_at,
      ${hasPrinted ? "s.printed_first_at" : "NULL::timestamptz AS printed_first_at"},
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'payment_type', sp.payment_type,
              'amount', sp.amount
            )
            ORDER BY sp.created_at, sp.id
          )
          FROM sales_payments sp
          WHERE sp.sale_id = s.id
        ),
        '[]'::json
      ) AS payments,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'item_name', se.item_name,
              'amount', se.amount
            )
            ORDER BY se.item_name, se.id
          )
          FROM sales_expenses se
          WHERE se.sale_id = s.id
        ),
        '[]'::json
      ) AS expenses,
      COALESCE(
        (
          SELECT SUM(se.amount)
          FROM sales_expenses se
          WHERE se.sale_id = s.id
        ),
        0
      )::int AS expense_total,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'type', 'product',
              'product_id', si.product_id,
              'sku', p.sku,
              'brand', b.name,
              'name', p.name,
              'size', p.size,
              'qty', si.qty,
              'price', si.sell_price,
              'line_total', si.line_total
            )
            ORDER BY
              CASE WHEN p.size ~ '-[0-9]+$' THEN CAST(SUBSTRING(p.size FROM '-([0-9]+)$') AS INTEGER) ELSE 999 END,
              CASE WHEN p.size ~ '^[0-9]+' THEN CAST(SUBSTRING(p.size FROM '^([0-9]+)') AS INTEGER) ELSE 999 END,
              p.size, b.name, p.name, p.sku
          )
          FROM sales_items si
          JOIN products p ON p.id = si.product_id
          JOIN brands b ON b.id = p.brand_id
          WHERE si.sale_id = s.id
        ),
        '[]'::json
      ) AS items,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'type', 'custom',
              'item_name', sci.item_name,
              'qty', sci.qty,
              'price', sci.price,
              'line_total', sci.line_total
            )
            ORDER BY sci.item_name
          )
          FROM sales_custom_items sci
          WHERE sci.sale_id = s.id
        ),
        '[]'::json
      ) AS custom_items
    FROM sales s
    WHERE s.store_id = $1
      ${dateFilter}
      AND (
        $${searchParam}::text IS NULL
        OR s.customer_plate_no ILIKE '%' || $${searchParam} || '%'
        OR EXISTS (
          SELECT 1
          FROM sales_items si2
          JOIN products p2 ON p2.id = si2.product_id
          JOIN brands b2 ON b2.id = p2.brand_id
          WHERE si2.sale_id = s.id
            AND (
              p2.sku ILIKE '%' || $${searchParam} || '%'
              OR p2.name ILIKE '%' || $${searchParam} || '%'
              OR p2.size ILIKE '%' || $${searchParam} || '%'
              OR b2.name ILIKE '%' || $${searchParam} || '%'
            )
        )
        OR EXISTS (
          SELECT 1
          FROM sales_custom_items sci2
          WHERE sci2.sale_id = s.id
            AND sci2.item_name ILIKE '%' || $${searchParam} || '%'
        )
      )
      AND (
        NOT $${hideExpenseOnlyParam}::boolean
        OR EXISTS (
          SELECT 1
          FROM sales_items si3
          WHERE si3.sale_id = s.id
        )
        OR EXISTS (
          SELECT 1
          FROM sales_custom_items sci3
          WHERE sci3.sale_id = s.id
        )
        OR NOT EXISTS (
          SELECT 1
          FROM sales_expenses se3
          WHERE se3.sale_id = s.id
        )
      )
    ORDER BY s.created_at DESC
    LIMIT $${limitParam} OFFSET $${offsetParam}
  `;

  const { rows } = await db.query(sql, params);
  return rows;
}

export async function updateSaleFields({
  storeId,
  saleId,
  userId,
  paymentType,
  payments,
  plateNo,
  discount,
  serviceFee,
  items,
  customItems,
  expenses,
}: {
  storeId: string;
  saleId: string;
  userId: string;
  paymentType?: string;
  payments?: SalePaymentInput[];
  plateNo?: string;
  discount?: number;
  serviceFee?: number;
  items?: SaleItemInput[];
  customItems?: CustomItemInput[];
  expenses?: SaleExpenseInput[];
}) {
  return await tx(async (client) => {
    if (plateNo) {
      await client.query(
        `
          INSERT INTO customers (store_id, plate_no)
          VALUES ($1, $2)
          ON CONFLICT (store_id, plate_no) DO NOTHING
        `,
        [storeId, plateNo],
      );
    }

    const currentSale = await client.query<{
      id: string;
      payment_type: string;
      subtotal: number;
      discount: number;
      service_fee: number;
    }>(
      "SELECT id, payment_type, subtotal, discount, service_fee FROM sales WHERE id = $1 AND store_id = $2 FOR UPDATE",
      [saleId, storeId],
    );
    
    if (!currentSale.rows[0]) throw badRequest("Sale tidak ditemukan");

    let newSubtotal = currentSale.rows[0].subtotal;
    const newDiscount = discount ?? currentSale.rows[0].discount;
    const newServiceFee = serviceFee ?? currentSale.rows[0].service_fee;

    if (items !== undefined) {
      const oldItems = await client.query<{ product_id: string; qty: number; unit_cost: number }>(
        "SELECT product_id, qty, unit_cost FROM sales_items WHERE sale_id = $1",
        [saleId],
      );
      
      for (const old of oldItems.rows) {
        await client.query(
          `UPDATE inventory_balances SET qty_on_hand = qty_on_hand + $3, updated_at = now() WHERE store_id = $1 AND product_id = $2`,
          [storeId, old.product_id, old.qty],
        );
        await client.query(
          `INSERT INTO inventory_ledger (store_id, product_id, txn_type, qty_delta, unit_cost, ref_type, ref_id, note) 
           VALUES ($1, $2, 'IN', $3, $4, 'MANUAL_ADJUST', $5, 'Reversal dari edit sale')`,
          [storeId, old.product_id, old.qty, old.unit_cost, saleId],
        );
      }
      
      await client.query("DELETE FROM sales_items WHERE sale_id = $1", [saleId]);
      
      if (items.length > 0) {
        const productIds = items.map((i) => i.product_id);
        await ensureBalances(client, storeId, productIds);
        const balances = await lockBalances(client, storeId, productIds);
        const balanceById = new Map(balances.map((b) => [b.product_id, b]));
        const priceRows = await getSellPrices(client, storeId, productIds);
        const sellPriceById = new Map(priceRows.map((r) => [r.product_id, r.sell_price]));
        
        const priced: PricedItem[] = items.map((item) => {
          const bal = balanceById.get(item.product_id);
          const sellPrice = sellPriceById.get(item.product_id);
          if (!sellPrice) throw badRequest("Produk tidak aktif di toko ini");
          if (!bal) throw badRequest("Inventory balance tidak ditemukan");
          if (bal.qty_on_hand < item.qty) throw badRequest("Stok tidak cukup");
          
          const unitCost = bal.avg_unit_cost;
          return {
            product_id: item.product_id,
            qty: item.qty,
            sell_price: sellPrice,
            unit_cost: unitCost,
            profit: (sellPrice - unitCost) * item.qty,
            line_total: sellPrice * item.qty,
          };
        });
        
        const salesItemRows = priced.map((i) => [saleId, i.product_id, i.qty, i.sell_price, i.unit_cost, i.profit, i.line_total]);
        const si = buildValuesPlaceholders(salesItemRows);
        await client.query(
          `INSERT INTO sales_items (sale_id, product_id, qty, sell_price, unit_cost, profit, line_total) VALUES ${si.placeholders}`,
          si.values,
        );
        
        const updateRows = priced.map((i) => [i.product_id, -i.qty]);
        const upd = buildValuesPlaceholders(updateRows, 2);
        await client.query(
          `UPDATE inventory_balances ib SET qty_on_hand = ib.qty_on_hand + v.qty_delta::int, updated_at = now() 
           FROM (VALUES ${upd.placeholders}) AS v(product_id, qty_delta) WHERE ib.store_id = $1 AND ib.product_id = v.product_id::uuid`,
          [storeId, ...upd.values],
        );
        
        const ledgerRows = priced.map((i) => [storeId, i.product_id, "OUT", -i.qty, i.unit_cost, "SALE", saleId, null]);
        const led = buildValuesPlaceholders(ledgerRows);
        await client.query(
          `INSERT INTO inventory_ledger (store_id, product_id, txn_type, qty_delta, unit_cost, ref_type, ref_id, note, txn_at)
           SELECT v.store_id::uuid, v.product_id::uuid, v.txn_type, v.qty_delta::int, v.unit_cost::int, v.ref_type, v.ref_id::uuid, v.note, now()
           FROM (VALUES ${led.placeholders}) AS v(store_id, product_id, txn_type, qty_delta, unit_cost, ref_type, ref_id, note)`,
          led.values,
        );
        
        newSubtotal = priced.reduce((sum, i) => sum + i.line_total, 0);
      } else {
        newSubtotal = 0;
      }
    }

    if (customItems !== undefined) {
      await client.query("DELETE FROM sales_custom_items WHERE sale_id = $1", [saleId]);
      
      if (customItems.length > 0) {
        const customItemRows = customItems.map((i) => [saleId, i.item_name, i.qty, i.price, i.qty * i.price]);
        const ci = buildValuesPlaceholders(customItemRows);
        await client.query(
          `INSERT INTO sales_custom_items (sale_id, item_name, qty, price, line_total) VALUES ${ci.placeholders}`,
          ci.values,
        );
        
        const customTotal = customItems.reduce((sum, i) => sum + i.qty * i.price, 0);
        if (items === undefined) {
          const productTotal = await client.query<{ sum: string }>(
            "SELECT COALESCE(SUM(line_total), 0) as sum FROM sales_items WHERE sale_id = $1",
            [saleId],
          );
          newSubtotal = parseInt(productTotal.rows[0]?.sum ?? "0") + customTotal;
        } else {
          newSubtotal += customTotal;
        }
      } else if (items === undefined) {
        const productTotal = await client.query<{ sum: string }>(
          "SELECT COALESCE(SUM(line_total), 0) as sum FROM sales_items WHERE sale_id = $1",
          [saleId],
        );
        newSubtotal = parseInt(productTotal.rows[0]?.sum ?? "0");
      }
    }

    const newTotal = newSubtotal - newDiscount + newServiceFee;

    let paymentTypeSummary = currentSale.rows[0].payment_type;
    let paymentRows: SalePaymentInput[] | null = null;

    if ((payments?.length ?? 0) > 0 || paymentType) {
      const normalized = normalizeSalePayments({
        paymentType,
        payments,
        total: newTotal,
      });
      paymentTypeSummary = normalized.paymentTypeSummary;
      paymentRows = normalized.paymentRows;
    } else {
      const existingPayments = await client.query<SalePaymentInput>(
        "SELECT payment_type, amount FROM sales_payments WHERE sale_id = $1 ORDER BY created_at, id FOR UPDATE",
        [saleId],
      );
      if (existingPayments.rows.length === 0) {
        paymentRows = [{ payment_type: paymentTypeSummary, amount: newTotal }];
      } else if (existingPayments.rows.length === 1) {
        const only = existingPayments.rows[0];
        if (!only) throw badRequest("Pembayaran tidak ditemukan");
        paymentRows = [{ payment_type: only.payment_type, amount: newTotal }];
        paymentTypeSummary = only.payment_type;
      } else {
        const sum = existingPayments.rows.reduce((acc, p) => acc + p.amount, 0);
        const diff = newTotal - sum;
        const next = existingPayments.rows.map((p) => ({ ...p }));
        if (diff !== 0) {
          let maxIdx = 0;
          for (let i = 1; i < next.length; i += 1) {
            if ((next[i]?.amount ?? 0) > (next[maxIdx]?.amount ?? 0)) maxIdx = i;
          }
          const updatedAmount = (next[maxIdx]?.amount ?? 0) + diff;
          if (updatedAmount <= 0) {
            throw badRequest("Total berubah. Mohon update pembayaran (split payment)");
          }
          const current = next[maxIdx];
          if (!current) throw badRequest("Pembayaran tidak ditemukan");
          next[maxIdx] = { payment_type: current.payment_type, amount: updatedAmount };
        }
        paymentRows = next;
        paymentTypeSummary = "MIXED";
      }
    }

    if (paymentRows) {
      await client.query("DELETE FROM sales_payments WHERE sale_id = $1", [saleId]);
      const rows = paymentRows.map((p) => [saleId, p.payment_type, p.amount, userId]);
      const pay = buildValuesPlaceholders(rows);
      await client.query(
        `INSERT INTO sales_payments (sale_id, payment_type, amount, created_by) VALUES ${pay.placeholders}`,
        pay.values,
      );
    }

    if (expenses !== undefined) {
      await client.query("DELETE FROM sales_expenses WHERE sale_id = $1", [saleId]);
      if (expenses.length > 0) {
        const expenseRows = expenses.map((e) => [saleId, e.item_name, e.amount, userId]);
        const exp = buildValuesPlaceholders(expenseRows);
        await client.query(
          `INSERT INTO sales_expenses (sale_id, item_name, amount, created_by) VALUES ${exp.placeholders}`,
          exp.values,
        );
      }
    }

    const updated = await client.query<{
      id: string;
      sale_date: string;
      payment_type: string;
      customer_plate_no: string;
      subtotal: number;
      discount: number;
      service_fee: number;
      total: number;
      created_at: string;
      printed_first_at?: string | null;
    }>(
      `
        UPDATE sales
        SET payment_type = $3,
            customer_plate_no = COALESCE($4, customer_plate_no),
            discount = $5,
            service_fee = $6,
            subtotal = $7,
            total = $8
        WHERE id = $1
          AND store_id = $2
        RETURNING id, sale_date, payment_type, customer_plate_no, subtotal, discount, service_fee, total, created_at
      `,
      [saleId, storeId, paymentTypeSummary, plateNo ?? null, newDiscount, newServiceFee, newSubtotal, newTotal],
    );

    const row = updated.rows[0];
    if (!row) throw badRequest("Sale tidak ditemukan");
    return row;
  });
}

export async function markSalePrintedFirst({
  db,
  storeId,
  saleId,
}: {
  db: DbConn;
  storeId: string;
  saleId: string;
}) {
  const hasPrinted = await hasPrintedFirstAtColumn(db);
  if (!hasPrinted) return null;

  const updated = await db.query<{ printed_first_at: string }>(
    `
      UPDATE sales
      SET printed_first_at = now()
      WHERE id = $1
        AND store_id = $2
        AND printed_first_at IS NULL
      RETURNING printed_first_at
    `,
    [saleId, storeId],
  );

  if (updated.rows[0]?.printed_first_at) return updated.rows[0].printed_first_at;

  const existing = await db.query<{ printed_first_at: string | null }>(
    "SELECT printed_first_at FROM sales WHERE id = $1 AND store_id = $2 LIMIT 1",
    [saleId, storeId],
  );
  return existing.rows[0]?.printed_first_at ?? null;
}

export async function getSaleDetail({
  db,
  storeId,
  saleId,
}: {
  db: DbConn;
  storeId: string;
  saleId: string;
}) {
  type SaleRow = {
    id: string;
    sale_date: string;
    payment_type: string;
    customer_plate_no: string;
    subtotal: number;
    total: number;
    discount: number;
    service_fee: number;
    created_by: string | null;
    created_at: string;
  };

  type SaleItemRow = {
    id: string;
    product_id: string;
    sku: string;
    name: string;
    size: string;
    brand: string;
    qty: number;
    sell_price: number;
    unit_cost: number;
    profit: number;
    line_total: number;
  };

  type CustomItemRow = {
    id: string;
    item_name: string;
    qty: number;
    price: number;
    line_total: number;
  };

  type PaymentRow = {
    payment_type: string;
    amount: number;
  };

  type ExpenseRow = {
    item_name: string;
    amount: number;
  };

  const saleRes = await db.query<SaleRow>(
    `
      SELECT id, sale_date, payment_type, customer_plate_no, subtotal, total, discount, service_fee, created_by, created_at
      FROM sales
      WHERE id = $1
        AND store_id = $2
      LIMIT 1
    `,
    [saleId, storeId],
  );
  const sale = saleRes.rows[0];
  if (!sale) return null;

  const itemsRes = await db.query<SaleItemRow>(
    `
      SELECT
        si.id,
        si.product_id,
        p.sku,
        p.name,
        p.size,
        b.name AS brand,
        si.qty,
        si.sell_price,
        si.unit_cost,
        si.profit,
        si.line_total
      FROM sales_items si
      JOIN products p ON p.id = si.product_id
      JOIN brands b ON b.id = p.brand_id
      WHERE si.sale_id = $1
      ORDER BY
        CASE WHEN p.size ~ '-[0-9]+$' THEN CAST(SUBSTRING(p.size FROM '-([0-9]+)$') AS INTEGER) ELSE 999 END,
        CASE WHEN p.size ~ '^[0-9]+' THEN CAST(SUBSTRING(p.size FROM '^([0-9]+)') AS INTEGER) ELSE 999 END,
        p.size, b.name, p.name, p.sku
    `,
    [saleId],
  );

  const customItemsRes = await db.query<CustomItemRow>(
    `
      SELECT id, item_name, qty, price, line_total
      FROM sales_custom_items
      WHERE sale_id = $1
      ORDER BY id
    `,
    [saleId],
  );

  const paymentsRes = await db.query<PaymentRow>(
    `
      SELECT payment_type, amount
      FROM sales_payments
      WHERE sale_id = $1
      ORDER BY created_at, id
    `,
    [saleId],
  );

  const expensesRes = await db.query<ExpenseRow>(
    `
      SELECT item_name, amount
      FROM sales_expenses
      WHERE sale_id = $1
      ORDER BY item_name, id
    `,
    [saleId],
  );

  return {
    sale,
    items: itemsRes.rows,
    customItems: customItemsRes.rows,
    payments: paymentsRes.rows,
    expenses: expensesRes.rows,
  };
}
