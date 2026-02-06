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
      LIMIT 10
    `,
    [storeId, date],
  );

  return {
    date,
    omzet: totalsRes.rows[0]?.omzet ?? 0,
    profit: profitRes.rows[0]?.profit ?? 0,
    transactions: totalsRes.rows[0]?.transactions ?? 0,
    top_skus: topRes.rows,
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
