import type { PoolClient, QueryResultRow } from "@neondatabase/serverless";
import { getPool } from "./pool";

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[],
) {
  const pool = getPool();
  const result = await pool.query<T>(text, values);
  return result.rows;
}

export async function tx<T>(fn: (client: PoolClient) => Promise<T>) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
