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

  const pool = new Pool({ connectionString: databaseUrl });
  globalThis.__mbPool = pool;
  return pool;
}
