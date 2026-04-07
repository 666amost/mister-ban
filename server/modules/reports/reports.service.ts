import { getPool } from "../../db/pool";
import { buildProductCategoryCaseSql } from "../../utils/product-category-sql";
import { getMonthlyStockReceiptSummary } from "../stock-receipts/stock-receipts.service";

const reportProductCategorySql = buildProductCategoryCaseSql({
  brandExpr: "b.name",
  productNameExpr: "p.name",
  productTypeExpr: "p.product_type",
});
const monthlyNormalizedBrandSql = "LOWER(TRIM(COALESCE(b.name, '')))";
const monthlyOliGardanSql = `
  (
    (
      ${monthlyNormalizedBrandSql} = 'oli'
      AND (
        LOWER(COALESCE(p.sku, '')) LIKE '%gardan%'
        OR LOWER(COALESCE(p.size, '')) LIKE '%gardan%'
      )
    )
    OR LOWER(COALESCE(b.name, '')) LIKE '%oli gardan%'
  )
`;
const monthlyCanonicalBrandSql = `
  CASE
    WHEN ${monthlyOliGardanSql} THEN 'Oli Gardan'
    WHEN ${monthlyNormalizedBrandSql} LIKE 'maxxis%' THEN 'Maxxis'
    WHEN ${monthlyNormalizedBrandSql} = 'victra' OR ${monthlyNormalizedBrandSql} LIKE 'victra %' THEN 'Maxxis'
    WHEN TRIM(COALESCE(b.name, '')) = '' THEN 'Lainnya'
    ELSE TRIM(b.name)
  END
`;

export type StoreSummaryRow = {
  store_id: string;
  store_name: string;
  omzet: number;
  profit: number;
  qty_ban: number;
};

type StoresSummaryParams =
  | {
      period: "day";
      date: string;
      month?: string;
    }
  | {
      period: "month";
      month: string;
      date?: string;
    };

function addUtcDays(dateValue: string, days: number): string {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addUtcMonths(monthValue: string, months: number): string {
  const date = new Date(`${monthValue}-01T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function resolveMonthlyRange(month: string): {
  start: string;
  end: string;
} {
  return {
    start: `${month}-01`,
    end: addUtcMonths(month, 1),
  };
}

function resolveStoresSummaryRange(params: StoresSummaryParams): {
  start: string;
  end: string;
} {
  if (params.period === "day") {
    return {
      start: params.date,
      end: addUtcDays(params.date, 1),
    };
  }

  return {
    start: `${params.month}-01`,
    end: addUtcMonths(params.month, 1),
  };
}

export async function getStoresSummary({
  period,
  date,
  month,
}: StoresSummaryParams): Promise<StoreSummaryRow[]> {
  const db = getPool();
  const { start, end } = resolveStoresSummaryRange({
    period,
    date,
    month,
  } as StoresSummaryParams);

  const res = await db.query<StoreSummaryRow>(
    `
      SELECT
        st.id AS store_id,
        st.name AS store_name,
        COALESCE(agg.omzet, 0)::int AS omzet,
        COALESCE(agg.profit, 0)::int AS profit,
        COALESCE(ban.qty_ban, 0)::int AS qty_ban
      FROM stores st
      LEFT JOIN LATERAL (
        SELECT
          SUM(s.total)::int AS omzet,
          SUM(
            s.total
            - COALESCE(c.cogs, 0)
            - COALESCE(e.expenses, 0)
          )::int AS profit
        FROM sales s
        LEFT JOIN (
          SELECT sale_id, COALESCE(SUM(qty * unit_cost), 0)::int AS cogs
          FROM sales_items GROUP BY sale_id
        ) c ON c.sale_id = s.id
        LEFT JOIN (
          SELECT sale_id, COALESCE(SUM(amount), 0)::int AS expenses
          FROM sales_expenses GROUP BY sale_id
        ) e ON e.sale_id = s.id
        WHERE s.store_id = st.id
          AND s.sale_date >= $1::date
          AND s.sale_date < $2::date
      ) agg ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(CASE WHEN categorized.category = 'BAN' THEN categorized.qty ELSE 0 END), 0)::int AS qty_ban
        FROM (
          SELECT
            si.qty,
            ${reportProductCategorySql} AS category
          FROM sales s2
          JOIN sales_items si ON si.sale_id = s2.id
          JOIN products p ON p.id = si.product_id
          JOIN brands b ON b.id = p.brand_id
          WHERE s2.store_id = st.id
            AND s2.sale_date >= $1::date
            AND s2.sale_date < $2::date
        ) categorized
      ) ban ON true
      ORDER BY st.name
    `,
    [start, end],
  );

  return res.rows;
}

export async function getDailyReport({
  storeId,
  date,
}: {
  storeId: string;
  date: string;
}) {
  const db = getPool();

  const totalsRes = await db.query<{ omzet: number; transactions: number }>(
    `
      SELECT COALESCE(SUM(total), 0)::int AS omzet, COUNT(*)::int AS transactions
      FROM sales
      WHERE store_id = $1
        AND sale_date = $2::date
    `,
    [storeId, date],
  );

  const qtyBreakdownRes = await db.query<{
    ban_qty: number;
    oli_qty: number;
    kampas_qty: number;
    custom_qty: number;
  }>(
    `
      WITH categorized_sales_items AS (
        SELECT
          si.qty,
          ${reportProductCategorySql} AS category
        FROM sales_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN products p ON p.id = si.product_id
        JOIN brands b ON b.id = p.brand_id
        WHERE s.store_id = $1
          AND s.sale_date = $2::date
      )
      SELECT
        COALESCE(SUM(CASE WHEN category = 'BAN' THEN qty ELSE 0 END), 0)::int AS ban_qty,
        COALESCE(SUM(CASE WHEN category = 'OLI' THEN qty ELSE 0 END), 0)::int AS oli_qty,
        COALESCE(SUM(CASE WHEN category = 'SPAREPART' THEN qty ELSE 0 END), 0)::int AS kampas_qty,
        COALESCE((
          SELECT SUM(sci.qty)::int
          FROM sales_custom_items sci
          JOIN sales s2 ON s2.id = sci.sale_id
          WHERE s2.store_id = $1
            AND s2.sale_date = $2::date
        ), 0)::int AS custom_qty
      FROM categorized_sales_items
    `,
    [storeId, date],
  );

  const paymentSummaryRes = await db.query<{
    cash: number;
    non_cash: number;
    qris: number;
    debit: number;
    transfer: number;
    credit: number;
  }>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN p.payment_type = 'CASH' THEN p.amount ELSE 0 END), 0)::int AS cash,
        COALESCE(SUM(CASE WHEN p.payment_type <> 'CASH' THEN p.amount ELSE 0 END), 0)::int AS non_cash,
        COALESCE(SUM(CASE WHEN p.payment_type = 'QRIS' THEN p.amount ELSE 0 END), 0)::int AS qris,
        COALESCE(SUM(CASE WHEN p.payment_type = 'DEBIT' THEN p.amount ELSE 0 END), 0)::int AS debit,
        COALESCE(SUM(CASE WHEN p.payment_type = 'TRANSFER' THEN p.amount ELSE 0 END), 0)::int AS transfer,
        COALESCE(SUM(CASE WHEN p.payment_type = 'CREDIT' THEN p.amount ELSE 0 END), 0)::int AS credit
      FROM (
        SELECT
          UPPER(COALESCE(sp.payment_type, s.payment_type, '')) AS payment_type,
          COALESCE(sp.amount, s.total, 0)::int AS amount
        FROM sales s
        LEFT JOIN LATERAL (
          SELECT payment_type, amount
          FROM sales_payments sp
          WHERE sp.sale_id = s.id
        ) sp ON true
        WHERE s.store_id = $1
          AND s.sale_date = $2::date
      ) p
    `,
    [storeId, date],
  );

  const profitRes = await db.query<{ profit: number }>(
    `
      SELECT
        COALESCE(
          SUM(
            s.total
            - COALESCE(c.cogs, 0)
            - COALESCE(e.expenses, 0)
          ),
          0
        )::int AS profit
      FROM sales s
      LEFT JOIN (
        SELECT sale_id, COALESCE(SUM(qty * unit_cost), 0)::int AS cogs
        FROM sales_items
        GROUP BY sale_id
      ) c ON c.sale_id = s.id
      LEFT JOIN (
        SELECT sale_id, COALESCE(SUM(amount), 0)::int AS expenses
        FROM sales_expenses
        GROUP BY sale_id
      ) e ON e.sale_id = s.id
      WHERE s.store_id = $1
        AND s.sale_date = $2::date
    `,
    [storeId, date],
  );

  const topRes = await db.query(
    `
      SELECT
        p.sku,
        p.name,
        p.size,
        b.name AS brand,
        COALESCE(SUM(si.qty), 0)::int AS qty,
        COALESCE(SUM(si.line_total), 0)::int AS revenue
      FROM sales_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      JOIN brands b ON b.id = p.brand_id
      WHERE s.store_id = $1
        AND s.sale_date = $2::date
      GROUP BY p.id, p.sku, p.name, p.size, b.name
      ORDER BY qty DESC, revenue DESC
    `,
    [storeId, date],
  );

  const customRes = await db.query<{ item_name: string; qty: number; revenue: number }>(
    `
      SELECT
        sci.item_name,
        COALESCE(SUM(sci.qty), 0)::int AS qty,
        COALESCE(SUM(sci.line_total), 0)::int AS revenue
      FROM sales_custom_items sci
      JOIN sales s ON s.id = sci.sale_id
      WHERE s.store_id = $1
        AND s.sale_date = $2::date
      GROUP BY sci.item_name
      ORDER BY qty DESC, revenue DESC, sci.item_name
    `,
    [storeId, date],
  );

  const expenseRes = await db.query<{ item_name: string; amount: number; entries: number }>(
    `
      SELECT
        se.item_name,
        COALESCE(SUM(se.amount), 0)::int AS amount,
        COUNT(*)::int AS entries
      FROM sales_expenses se
      JOIN sales s ON s.id = se.sale_id
      WHERE s.store_id = $1
        AND s.sale_date = $2::date
      GROUP BY se.item_name
      ORDER BY amount DESC, se.item_name
    `,
    [storeId, date],
  );

  const discountTotalRes = await db.query<{ discount_total: number }>(
    `SELECT COALESCE(SUM(discount), 0)::int AS discount_total
     FROM sales
     WHERE store_id = $1 AND sale_date = $2::date`,
    [storeId, date],
  );

  const inputsRes = await db.query<{
    sale_id: string;
    created_at: string;
    customer_plate_no: string;
    payment_method: string;
    input_type: "product" | "custom" | "expense" | "discount";
    sku: string | null;
    item_name: string;
    qty: number;
    unit_price: number;
    line_total: number;
  }>(
    `
      WITH base_sales AS (
        SELECT
          s.id,
          s.created_at,
          s.customer_plate_no,
          COALESCE(s.discount, 0)::int AS sale_discount,
          COALESCE(
            NULLIF(pay.payment_method, ''),

            NULLIF(UPPER(COALESCE(s.payment_type, '')), ''),
            '-'
          ) AS payment_method
        FROM sales s
        LEFT JOIN LATERAL (
          SELECT string_agg(pm.payment_type, ' + ' ORDER BY pm.payment_type) AS payment_method
          FROM (
            SELECT DISTINCT UPPER(COALESCE(sp.payment_type, '')) AS payment_type
            FROM sales_payments sp
            WHERE sp.sale_id = s.id
              AND COALESCE(sp.payment_type, '') <> ''
          ) pm
        ) pay ON true
        WHERE s.store_id = $1
          AND s.sale_date = $2::date
      )
      SELECT *
      FROM (
        SELECT
          s.id AS sale_id,
          s.created_at,
          s.customer_plate_no,
          s.payment_method,
          'product'::text AS input_type,
          p.sku,
          CONCAT_WS(' ', b.name, p.name, p.size) AS item_name,
          si.qty::int AS qty,
          si.sell_price::int AS unit_price,
          si.line_total::int AS line_total
        FROM sales_items si
        JOIN base_sales s ON s.id = si.sale_id
        JOIN products p ON p.id = si.product_id
        JOIN brands b ON b.id = p.brand_id

        UNION ALL

        SELECT
          s.id AS sale_id,
          s.created_at,
          s.customer_plate_no,
          s.payment_method,
          'custom'::text AS input_type,
          NULL::text AS sku,
          sci.item_name,
          sci.qty::int AS qty,
          sci.price::int AS unit_price,
          sci.line_total::int AS line_total
        FROM sales_custom_items sci
        JOIN base_sales s ON s.id = sci.sale_id

        UNION ALL

        SELECT
          s.id AS sale_id,
          s.created_at,
          s.customer_plate_no,
          s.payment_method,
          'expense'::text AS input_type,
          NULL::text AS sku,
          se.item_name,
          1::int AS qty,
          se.amount::int AS unit_price,
          se.amount::int AS line_total
        FROM sales_expenses se
        JOIN base_sales s ON s.id = se.sale_id

        UNION ALL

        SELECT
          s.id AS sale_id,
          s.created_at,
          s.customer_plate_no,
          s.payment_method,
          'discount'::text AS input_type,
          NULL::text AS sku,
          'Diskon'::text AS item_name,
          1::int AS qty,
          s.sale_discount AS unit_price,
          s.sale_discount AS line_total
        FROM base_sales s
        WHERE s.sale_discount > 0
      ) entries
      ORDER BY created_at DESC, sale_id, input_type, item_name
    `,
    [storeId, date],
  );

  const expenseTotal = expenseRes.rows.reduce((sum, row) => sum + row.amount, 0);
  const paymentSummary = paymentSummaryRes.rows[0] ?? {
    cash: 0,
    non_cash: 0,
    qris: 0,
    debit: 0,
    transfer: 0,
    credit: 0,
  };
  const qtyBreakdown = qtyBreakdownRes.rows[0] ?? {
    ban_qty: 0,
    oli_qty: 0,
    kampas_qty: 0,
    custom_qty: 0,
  };
  const stockReceiptSummary = await getMonthlyStockReceiptSummary({
    storeId,
    start: date,
    end: addUtcDays(date, 1),
  });

  return {
    date,
    omzet: totalsRes.rows[0]?.omzet ?? 0,
    profit: profitRes.rows[0]?.profit ?? 0,
    transactions: totalsRes.rows[0]?.transactions ?? 0,
    payment_summary: paymentSummary,
    stock_receipt_total_qty: stockReceiptSummary.total_qty,
    stock_receipt_total_receipts: stockReceiptSummary.total_receipts,
    stock_receipt_daily: stockReceiptSummary.daily,
    qty_breakdown: qtyBreakdown,
    top_skus: topRes.rows,
    custom_items: customRes.rows,
    expenses: expenseRes.rows,
    expense_total: expenseTotal,
    discount_total: discountTotalRes.rows[0]?.discount_total ?? 0,
    inputs: inputsRes.rows,
  };
}

export async function getMonthlyReport({
  storeId,
  month,
}: {
  storeId: string;
  month: string;
}) {
  const db = getPool();
  const { start, end: endIso } = resolveMonthlyRange(month);

  const totalsRes = await db.query<{ omzet: number; transactions: number }>(
    `
      SELECT COALESCE(SUM(total), 0)::int AS omzet, COUNT(*)::int AS transactions
      FROM sales
      WHERE store_id = $1
        AND sale_date >= $2::date
        AND sale_date < $3::date
    `,
    [storeId, start, endIso],
  );

  const paymentSummaryRes = await db.query<{
    cash: number;
    non_cash: number;
    qris: number;
    debit: number;
    transfer: number;
    credit: number;
  }>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN p.payment_type = 'CASH' THEN p.amount ELSE 0 END), 0)::int AS cash,
        COALESCE(SUM(CASE WHEN p.payment_type <> 'CASH' THEN p.amount ELSE 0 END), 0)::int AS non_cash,
        COALESCE(SUM(CASE WHEN p.payment_type = 'QRIS' THEN p.amount ELSE 0 END), 0)::int AS qris,
        COALESCE(SUM(CASE WHEN p.payment_type = 'DEBIT' THEN p.amount ELSE 0 END), 0)::int AS debit,
        COALESCE(SUM(CASE WHEN p.payment_type = 'TRANSFER' THEN p.amount ELSE 0 END), 0)::int AS transfer,
        COALESCE(SUM(CASE WHEN p.payment_type = 'CREDIT' THEN p.amount ELSE 0 END), 0)::int AS credit
      FROM (
        SELECT
          UPPER(COALESCE(sp.payment_type, s.payment_type, '')) AS payment_type,
          COALESCE(sp.amount, s.total, 0)::int AS amount
        FROM sales s
        LEFT JOIN LATERAL (
          SELECT payment_type, amount
          FROM sales_payments sp
          WHERE sp.sale_id = s.id
        ) sp ON true
        WHERE s.store_id = $1
          AND s.sale_date >= $2::date
          AND s.sale_date < $3::date
      ) p
    `,
    [storeId, start, endIso],
  );

  const profitRes = await db.query<{ profit: number }>(
    `
      SELECT
        COALESCE(
          SUM(
            s.total
            - COALESCE(c.cogs, 0)
            - COALESCE(e.expenses, 0)
          ),
          0
        )::int AS profit
      FROM sales s
      LEFT JOIN (
        SELECT sale_id, COALESCE(SUM(qty * unit_cost), 0)::int AS cogs
        FROM sales_items
        GROUP BY sale_id
      ) c ON c.sale_id = s.id
      LEFT JOIN (
        SELECT sale_id, COALESCE(SUM(amount), 0)::int AS expenses
        FROM sales_expenses
        GROUP BY sale_id
      ) e ON e.sale_id = s.id
      WHERE s.store_id = $1
        AND s.sale_date >= $2::date
        AND s.sale_date < $3::date
    `,
    [storeId, start, endIso],
  );

  const dailySalesRes = await db.query<{
    sale_date: string;
    omzet: number;
    transactions: number;
  }>(
    `
      SELECT sale_date, COALESCE(SUM(total), 0)::int AS omzet, COUNT(*)::int AS transactions
      FROM sales
      WHERE store_id = $1
        AND sale_date >= $2::date
        AND sale_date < $3::date
      GROUP BY sale_date
      ORDER BY sale_date
    `,
    [storeId, start, endIso],
  );

  const dailyProfitRes = await db.query<{ sale_date: string; profit: number }>(
    `
      SELECT
        s.sale_date,
        COALESCE(
          SUM(
            s.total
            - COALESCE(c.cogs, 0)
            - COALESCE(e.expenses, 0)
          ),
          0
        )::int AS profit
      FROM sales s
      LEFT JOIN (
        SELECT sale_id, COALESCE(SUM(qty * unit_cost), 0)::int AS cogs
        FROM sales_items
        GROUP BY sale_id
      ) c ON c.sale_id = s.id
      LEFT JOIN (
        SELECT sale_id, COALESCE(SUM(amount), 0)::int AS expenses
        FROM sales_expenses
        GROUP BY sale_id
      ) e ON e.sale_id = s.id
      WHERE s.store_id = $1
        AND s.sale_date >= $2::date
        AND s.sale_date < $3::date
      GROUP BY s.sale_date
      ORDER BY s.sale_date
    `,
    [storeId, start, endIso],
  );

  const profitByDate = new Map(
    dailyProfitRes.rows.map((r) => [r.sale_date, r.profit]),
  );
  const daily = dailySalesRes.rows.map((r) => ({
    sale_date: r.sale_date,
    omzet: r.omzet,
    profit: profitByDate.get(r.sale_date) ?? 0,
    transactions: r.transactions,
  }));

  const topRes = await db.query(
    `
      SELECT
        p.sku,
        p.name,
        p.size,
        b.name AS brand,
        COALESCE(SUM(si.qty), 0)::int AS qty,
        COALESCE(SUM(si.line_total), 0)::int AS revenue
      FROM sales_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      JOIN brands b ON b.id = p.brand_id
      WHERE s.store_id = $1
        AND s.sale_date >= $2::date
        AND s.sale_date < $3::date
      GROUP BY p.id, p.sku, p.name, p.size, b.name
      ORDER BY qty DESC, revenue DESC
      LIMIT 20
    `,
    [storeId, start, endIso],
  );

  const expenseTotalRes = await db.query<{ expense_total: number }>(
    `
      SELECT COALESCE(SUM(se.amount), 0)::int AS expense_total
      FROM sales_expenses se
      JOIN sales s ON s.id = se.sale_id
      WHERE s.store_id = $1
        AND s.sale_date >= $2::date
        AND s.sale_date < $3::date
    `,
    [storeId, start, endIso],
  );

  const brandTransactionsRes = await db.query<{ brand: string; qty: number }>(
    `
      SELECT
        b.name AS brand,
        SUM(si.qty)::int AS qty
      FROM sales_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      JOIN brands b ON b.id = p.brand_id
      WHERE s.store_id = $1
        AND s.sale_date >= $2::date
        AND s.sale_date < $3::date
        AND NOT (
          (
            LOWER(TRIM(b.name)) = 'oli'
            AND (
              LOWER(COALESCE(p.sku, '')) LIKE '%gardan%'
              OR LOWER(COALESCE(p.size, '')) LIKE '%gardan%'
            )
          )
          OR LOWER(b.name) LIKE '%oli gardan%'
        )
      GROUP BY b.name
      ORDER BY qty DESC, brand
    `,
    [storeId, start, endIso],
  );

  const oliGardanTransactionsRes = await db.query<{ qty: number }>(
    `
      SELECT SUM(si.qty)::int AS qty
      FROM sales_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      JOIN brands b ON b.id = p.brand_id
      WHERE s.store_id = $1
        AND s.sale_date >= $2::date
        AND s.sale_date < $3::date
        AND (
          (
            LOWER(TRIM(b.name)) = 'oli'
            AND (
              LOWER(COALESCE(p.sku, '')) LIKE '%gardan%'
              OR LOWER(COALESCE(p.size, '')) LIKE '%gardan%'
            )
          )
          OR LOWER(b.name) LIKE '%oli gardan%'
        )
    `,
    [storeId, start, endIso],
  );

  const expenseRes = await db.query<{ item_name: string; amount: number; entries: number }>(
    `
      SELECT
        se.item_name,
        COALESCE(SUM(se.amount), 0)::int AS amount,
        COUNT(*)::int AS entries
      FROM sales_expenses se
      JOIN sales s ON s.id = se.sale_id
      WHERE s.store_id = $1
        AND s.sale_date >= $2::date
        AND s.sale_date < $3::date
      GROUP BY se.item_name
      ORDER BY amount DESC, se.item_name
    `,
    [storeId, start, endIso],
  );

  const stockReceiptSummary = await getMonthlyStockReceiptSummary({
    storeId,
    start,
    end: endIso,
  });

  const paymentSummary = paymentSummaryRes.rows[0] ?? {
    cash: 0,
    non_cash: 0,
    qris: 0,
    debit: 0,
    transfer: 0,
    credit: 0,
  };

  return {
    month,
    omzet: totalsRes.rows[0]?.omzet ?? 0,
    profit: profitRes.rows[0]?.profit ?? 0,
    transactions: totalsRes.rows[0]?.transactions ?? 0,
    payment_summary: paymentSummary,
    expense_total: expenseTotalRes.rows[0]?.expense_total ?? 0,
    stock_receipt_total_qty: stockReceiptSummary.total_qty,
    stock_receipt_total_receipts: stockReceiptSummary.total_receipts,
    stock_receipt_daily: stockReceiptSummary.daily,
    oli_gardan_qty: oliGardanTransactionsRes.rows[0]?.qty ?? 0,
    daily,
    top_skus: topRes.rows,
    brand_transactions: brandTransactionsRes.rows,
    expenses: expenseRes.rows,
  };
}

export async function getMonthlyBrandDetail({
  storeId,
  month,
  brand,
}: {
  storeId: string;
  month: string;
  brand: string;
}) {
  const db = getPool();
  const { start, end: endIso } = resolveMonthlyRange(month);

  const detailRes = await db.query<{
    sku: string;
    name: string;
    size: string;
    brand: string;
    qty: number;
    revenue: number;
    transactions: number;
    sale_dates_csv: string;
  }>(
    `
      SELECT
        COALESCE(p.sku, '') AS sku,
        p.name,
        COALESCE(p.size, '') AS size,
        COALESCE(NULLIF(TRIM(b.name), ''), 'Lainnya') AS brand,
        COALESCE(SUM(si.qty), 0)::int AS qty,
        COALESCE(SUM(si.line_total), 0)::int AS revenue,
        COUNT(DISTINCT s.id)::int AS transactions,
        COALESCE(
          STRING_AGG(DISTINCT TO_CHAR(s.sale_date, 'YYYY-MM-DD'), ',' ORDER BY TO_CHAR(s.sale_date, 'YYYY-MM-DD')),
          ''
        ) AS sale_dates_csv
      FROM sales_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      JOIN brands b ON b.id = p.brand_id
      WHERE s.store_id = $1
        AND s.sale_date >= $2::date
        AND s.sale_date < $3::date
        AND ${monthlyCanonicalBrandSql} = $4
      GROUP BY p.id, p.sku, p.name, p.size, b.name
      ORDER BY qty DESC, revenue DESC, brand, p.name, p.size, p.sku
    `,
    [storeId, start, endIso, brand],
  );

  const qty = detailRes.rows.reduce((sum, item) => sum + item.qty, 0);
  const revenue = detailRes.rows.reduce((sum, item) => sum + item.revenue, 0);
  const items = detailRes.rows.map((item) => ({
    sku: item.sku,
    name: item.name,
    size: item.size,
    brand: item.brand,
    qty: item.qty,
    revenue: item.revenue,
    transactions: item.transactions,
    sale_dates: item.sale_dates_csv
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  }));

  return {
    brand,
    month,
    qty,
    revenue,
    sku_count: items.length,
    items,
  };
}
