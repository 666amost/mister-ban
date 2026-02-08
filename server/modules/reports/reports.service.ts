import { getPool } from "../../db/pool";

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

  const inputsRes = await db.query<{
    sale_id: string;
    created_at: string;
    customer_plate_no: string;
    input_type: "product" | "custom" | "expense";
    sku: string | null;
    item_name: string;
    qty: number;
    unit_price: number;
    line_total: number;
  }>(
    `
      SELECT *
      FROM (
        SELECT
          s.id AS sale_id,
          s.created_at,
          s.customer_plate_no,
          'product'::text AS input_type,
          p.sku,
          CONCAT_WS(' ', b.name, p.name, p.size) AS item_name,
          si.qty::int AS qty,
          si.sell_price::int AS unit_price,
          si.line_total::int AS line_total
        FROM sales_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN products p ON p.id = si.product_id
        JOIN brands b ON b.id = p.brand_id
        WHERE s.store_id = $1
          AND s.sale_date = $2::date

        UNION ALL

        SELECT
          s.id AS sale_id,
          s.created_at,
          s.customer_plate_no,
          'custom'::text AS input_type,
          NULL::text AS sku,
          sci.item_name,
          sci.qty::int AS qty,
          sci.price::int AS unit_price,
          sci.line_total::int AS line_total
        FROM sales_custom_items sci
        JOIN sales s ON s.id = sci.sale_id
        WHERE s.store_id = $1
          AND s.sale_date = $2::date

        UNION ALL

        SELECT
          s.id AS sale_id,
          s.created_at,
          s.customer_plate_no,
          'expense'::text AS input_type,
          NULL::text AS sku,
          se.item_name,
          1::int AS qty,
          se.amount::int AS unit_price,
          se.amount::int AS line_total
        FROM sales_expenses se
        JOIN sales s ON s.id = se.sale_id
        WHERE s.store_id = $1
          AND s.sale_date = $2::date
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

  return {
    date,
    omzet: totalsRes.rows[0]?.omzet ?? 0,
    profit: profitRes.rows[0]?.profit ?? 0,
    transactions: totalsRes.rows[0]?.transactions ?? 0,
    payment_summary: paymentSummary,
    top_skus: topRes.rows,
    custom_items: customRes.rows,
    expenses: expenseRes.rows,
    expense_total: expenseTotal,
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
  const start = `${month}-01`;
  const end = new Date(`${month}-01T00:00:00.000Z`);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const endIso = end.toISOString().slice(0, 10);

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

  return {
    month,
    omzet: totalsRes.rows[0]?.omzet ?? 0,
    profit: profitRes.rows[0]?.profit ?? 0,
    transactions: totalsRes.rows[0]?.transactions ?? 0,
    daily,
    top_skus: topRes.rows,
  };
}
