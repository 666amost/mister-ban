import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

declare global {
  var __mbPool: Pool | undefined;
}

export function getPool() {
  if (globalThis.__mbPool) return globalThis.__mbPool;

  const runtimeConfig = useRuntimeConfig();
  const databaseUrl =
    runtimeConfig.databaseUrl ||
    process.env.DATABASE_URL ||
    process.env.NUXT_DATABASE_URL ||
    "";
  if (!databaseUrl)
    throw new Error(
      "Database URL is required. Set DATABASE_URL (recommended) or NUXT_DATABASE_URL.",
    );

  if (/^https?:\/\//i.test(databaseUrl)) {
    throw new Error(
      "DATABASE_URL must be a Postgres connection string (postgres:// or postgresql://), not an http(s) URL.",
    );
  }

  const pool = new Pool({ 
    connectionString: databaseUrl,
    max: process.env.NODE_ENV === 'production' ? 1 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  
  globalThis.__mbPool = pool;
  return pool;
}
