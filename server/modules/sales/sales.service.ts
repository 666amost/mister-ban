import { tx } from "../../db/db";
import { badRequest } from "../../utils/http";
import { ensureBalances, lockBalances } from "../inventory/inventory.repo";
import type { DbConn } from "../../db/conn";
import { buildValuesPlaceholders } from "../../utils/sql";

type SaleItemInput = { product_id: string; qty: number };
type CustomItemInput = { item_name: string; qty: number; price: number };

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

export async function createSale({
  storeId,
  userId,
  saleDate,
  paymentType,
  plateNo,
  items,
  customItems,
  discount,
  serviceFee,
}: {
  storeId: string;
  userId: string;
  saleDate: string;
  paymentType: string;
  plateNo: string;
  items: SaleItemInput[];
  customItems: CustomItemInput[];
  discount: number;
  serviceFee: number;
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

    const productSubtotal = priced.reduce((sum, i) => sum + i.line_total, 0);
    const customSubtotal = customItems.reduce((sum, i) => sum + i.qty * i.price, 0);
    const subtotal = productSubtotal + customSubtotal;
    const total = subtotal - discount + serviceFee;

    const saleRes = await client.query<{ id: string; created_at: string }>(
      `
        INSERT INTO sales (store_id, sale_date, payment_type, customer_plate_no, subtotal, total, discount, service_fee, created_by)
        VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, created_at
      `,
      [storeId, saleDate, paymentType, plateNo, subtotal, total, discount, serviceFee, userId],
    );
    const saleId = saleRes.rows[0]?.id;
    if (!saleId) throw badRequest("Gagal membuat sales");

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

export async function listSales({
  db,
  storeId,
  date,
  allDates,
  q,
  limit,
  offset,
}: {
  db: DbConn;
  storeId: string;
  date: string;
  allDates?: boolean;
  q?: string;
  limit: number;
  offset: number;
}) {
  const hasPrinted = await hasPrintedFirstAtColumn(db);
  const search = q?.trim() || null;

  const dateFilter = allDates ? "" : "AND s.sale_date = $2::date";
  
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
              'type', 'product',
              'sku', p.sku,
              'brand', b.name,
              'name', p.name,
              'size', p.size,
              'qty', si.qty,
              'price', si.sell_price,
              'line_total', si.line_total
            )
            ORDER BY b.name, p.name, p.size, p.sku
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
        $5::text IS NULL
        OR s.customer_plate_no ILIKE '%' || $5 || '%'
        OR EXISTS (
          SELECT 1
          FROM sales_items si2
          JOIN products p2 ON p2.id = si2.product_id
          JOIN brands b2 ON b2.id = p2.brand_id
          WHERE si2.sale_id = s.id
            AND (
              p2.sku ILIKE '%' || $5 || '%'
              OR p2.name ILIKE '%' || $5 || '%'
              OR p2.size ILIKE '%' || $5 || '%'
              OR b2.name ILIKE '%' || $5 || '%'
            )
        )
        OR EXISTS (
          SELECT 1
          FROM sales_custom_items sci2
          WHERE sci2.sale_id = s.id
            AND sci2.item_name ILIKE '%' || $5 || '%'
        )
      )
    ORDER BY s.created_at DESC
    LIMIT $3 OFFSET $4
  `;

  const { rows } = await db.query(sql, [storeId, date, limit, offset, search]);
  return rows;
}

export async function updateSaleFields({
  storeId,
  saleId,
  paymentType,
  plateNo,
  discount,
  serviceFee,
  items,
  customItems,
}: {
  storeId: string;
  saleId: string;
  paymentType?: string;
  plateNo?: string;
  discount?: number;
  serviceFee?: number;
  items?: SaleItemInput[];
  customItems?: CustomItemInput[];
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
      subtotal: number;
      discount: number;
      service_fee: number;
    }>("SELECT id, subtotal, discount, service_fee FROM sales WHERE id = $1 AND store_id = $2 FOR UPDATE", [saleId, storeId]);
    
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
        SET payment_type = COALESCE($3, payment_type),
            customer_plate_no = COALESCE($4, customer_plate_no),
            discount = $5,
            service_fee = $6,
            subtotal = $7,
            total = $8
        WHERE id = $1
          AND store_id = $2
        RETURNING id, sale_date, payment_type, customer_plate_no, subtotal, discount, service_fee, total, created_at
      `,
      [saleId, storeId, paymentType ?? null, plateNo ?? null, newDiscount, newServiceFee, newSubtotal, newTotal],
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
      ORDER BY b.name, p.name, p.size, p.sku
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

  return { sale, items: itemsRes.rows, customItems: customItemsRes.rows };
}
