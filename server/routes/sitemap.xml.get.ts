import { setResponseHeader } from "h3"
import { defineCachedEventHandler } from "nitropack/runtime/internal/cache"
import { getPool } from "~/server/db/pool"
import { publicBranchSlug } from "~/server/utils/public-branches"
import { getPublicSiteOrigin } from "~/server/utils/public-seo"
import { PUBLIC_PAGE_PATHS } from "~/utils/public-seo"

type SitemapStoreRow = { name: string }

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    }
    return entities[character] ?? character
  })
}

export default defineCachedEventHandler(
  async (event) => {
    const origin = getPublicSiteOrigin(event)
    const { rows } = await getPool().query<SitemapStoreRow>(
      `SELECT name FROM stores WHERE status = 'active' ORDER BY name`,
    )
    const locations = [...new Set([
      ...PUBLIC_PAGE_PATHS.map((path) => `${origin}${path}`),
      ...rows.map((store) => `${origin}/cabang/${publicBranchSlug(store.name)}`),
    ])]
    const body = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
      ...locations.map((location) => `  <url><loc>${escapeXml(location)}</loc></url>`),
      `</urlset>`,
    ].join("\n")

    setResponseHeader(event, "content-type", "application/xml; charset=utf-8")
    setResponseHeader(event, "cache-control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400")
    return body
  },
  { maxAge: 60 * 60 * 24, swr: true, name: "public-sitemap", varies: ["host", "x-forwarded-host", "x-forwarded-proto"] },
)
