import { setResponseHeaders } from "h3"
import { defineCachedEventHandler } from "nitropack/runtime/internal/cache"
import { getPool } from "~/server/db/pool"
import { publicTireFilterSql } from "~/server/utils/public-tires"
import type { PublicTireSizesResponse } from "~/types/public"

export default defineCachedEventHandler(async (event): Promise<PublicTireSizesResponse> => {
  setResponseHeaders(event, {
    "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    "CDN-Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    "Vercel-CDN-Cache-Control": "public, max-age=300, stale-while-revalidate=600",
  })
  const { rows } = await getPool().query<{ size: string }>(`
    SELECT DISTINCT TRIM(p.size) AS size
    FROM store_products sp
    JOIN stores s ON s.id = sp.store_id
    JOIN products p ON p.id = sp.product_id
    JOIN brands b ON b.id = p.brand_id
    WHERE ${publicTireFilterSql}
      AND NULLIF(TRIM(p.size), '') IS NOT NULL
    ORDER BY size
  `)
  return { sizes: rows.map(row => row.size).sort((a, b) => a.localeCompare(b, "id", { numeric: true })) }
}, { maxAge: 300, swr: true, name: "public-tire-sizes-v1" })
