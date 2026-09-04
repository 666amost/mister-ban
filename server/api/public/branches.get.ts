import { setResponseHeaders } from "h3"
import { defineCachedEventHandler } from "nitropack/runtime/internal/cache"
import type { PublicBranch, PublicBranchesResponse } from "~/types/public"
import { getPool } from "~/server/db/pool"
import {
  buildMapsUrl,
  normalizeStoreCode,
  normalizeWhatsapp,
  publicBranchMeta,
  publicBranchSlug,
  resolveInstagram,
  type PublicStoreRow,
} from "~/server/utils/public-branches"

export default defineCachedEventHandler(
  async (event): Promise<PublicBranchesResponse> => {
    setResponseHeaders(event, {
      "Cache-Control": "public, max-age=300, s-maxage=21600, stale-while-revalidate=86400",
      "CDN-Cache-Control": "public, max-age=21600, stale-while-revalidate=86400",
      "Vercel-CDN-Cache-Control": "public, max-age=21600, stale-while-revalidate=86400",
    })

    const { rows } = await getPool().query<PublicStoreRow>(
      `
        SELECT
          name,
          code,
          address,
          city,
          operating_hours,
          status,
          receipt_instagram_mode,
          receipt_instagram
        FROM stores
        WHERE status = 'active'
        ORDER BY city, name
      `,
    )

    const branches: PublicBranch[] = rows.map((store) => {
      const meta = publicBranchMeta(store.code)
      const address = store.address?.trim() ?? ""
      return {
        code: normalizeStoreCode(store.code) || publicBranchSlug(store.name),
        slug: publicBranchSlug(store.name),
        name: store.name,
        address,
        city: store.city?.trim() ?? "",
        operatingHours: (store.operating_hours ?? "")
          .split(/\r?\n/)
          .map((value) => value.trim())
          .filter(Boolean),
        instagram: resolveInstagram(store),
        whatsapp: normalizeWhatsapp(meta.whatsapp),
        latitude: meta.latitude ?? null,
        longitude: meta.longitude ?? null,
        mapsUrl: buildMapsUrl(store.name, address),
      }
    })

    return { branches, updatedAt: new Date().toISOString() }
  },
  {
    maxAge: 60 * 60 * 6,
    swr: true,
    name: "public-branches",
  },
)
