import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

declare global {
  var __mbPool: Pool | undefined;
}

export function getPool() {
  if (globalThis.__mbPool) return globalThis.__mbPool;

  const { databaseUrl } = useRuntimeConfig();
  if (!databaseUrl) throw new Error("runtimeConfig.databaseUrl is required");

  const pool = new Pool({ 
    connectionString: databaseUrl,
    max: process.env.NODE_ENV === 'production' ? 1 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  
  globalThis.__mbPool = pool;
  return pool;
}
