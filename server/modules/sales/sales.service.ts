import { tx } from "../../db/db";
import { badRequest } from "../../utils/http";
import { ensureBalances, lockBalances } from "../inventory/inventory.repo";
import type { DbConn } from "../../db/conn";
import { buildValuesPlaceholders } from "../../utils/sql";

type SaleItemInput = { product_id: string; qty: number };

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

export async function createSale({
  storeId,
  userId,
  saleDate,
  paymentType,
  plateNo,
  items,
}: {
  storeId: string;
  userId: string;
  saleDate: string;
  paymentType: string;
  plateNo: string;
  items: SaleItemInput[];
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

    await client.query(
      "INSERT INTO customers (store_id, plate_no) VALUES ($1, $2) ON CONFLICT (store_id, plate_no) DO NOTHING",
      [storeId, plateNo],
    );

    const subtotal = priced.reduce((sum, i) => sum + i.line_total, 0);
    const total = subtotal;

    const saleRes = await client.query<{ id: string; created_at: string }>(
      `
        INSERT INTO sales (store_id, sale_date, payment_type, customer_plate_no, subtotal, total, created_by)
        VALUES ($1, $2::date, $3, $4, $5, $6, $7)
        RETURNING id, created_at
      `,
      [storeId, saleDate, paymentType, plateNo, subtotal, total, userId],
    );
    const saleId = saleRes.rows[0]?.id;
    if (!saleId) throw badRequest("Gagal membuat sales");

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

    return { sale_id: saleId };
  });
}

export async function listSales({
  db,
  storeId,
  date,
  limit,
  offset,
}: {
  db: DbConn;
  storeId: string;
  date: string;
  limit: number;
  offset: number;
}) {
  const { rows } = await db.query(
    `
      SELECT id, sale_date, payment_type, customer_plate_no, total, created_at
      FROM sales
      WHERE store_id = $1
        AND sale_date = $2::date
      ORDER BY created_at DESC
      LIMIT $3
      OFFSET $4
    `,
    [storeId, date, limit, offset],
  );
  return rows;
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

  const saleRes = await db.query<SaleRow>(
    `
      SELECT id, sale_date, payment_type, customer_plate_no, subtotal, total, created_by, created_at
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
      ORDER BY b.name, p.name, p.size, p.sku
    `,
    [saleId],
  );
  return { sale, items: itemsRes.rows };
}
