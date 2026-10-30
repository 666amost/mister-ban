import { setResponseHeader } from "h3"
import { getPublicSiteOrigin } from "~/server/utils/public-seo"

const searchCrawlers = ["Googlebot", "Googlebot-Image", "Google-InspectionTool", "bingbot", "DuckDuckBot", "Applebot"]
const allowedPaths = ["/$", "/?", "/cek-ban", "/merek", "/cabang", "/_nuxt/", "/brand/", "/api/public/", "/sitemap.xml$", "/favicon", "/apple-touch-icon.png$"]

export default defineEventHandler((event) => {
  const origin = getPublicSiteOrigin(event)
  setResponseHeader(event, "content-type", "text/plain; charset=utf-8")
  setResponseHeader(event, "cache-control", "public, max-age=3600, s-maxage=86400")
  if (!useRuntimeConfig(event).public.siteIndexable) return "User-agent: *\nDisallow: /\n"
  return [
    ...searchCrawlers.map((crawler) => `User-agent: ${crawler}`),
    "Disallow: /",
    ...allowedPaths.map((path) => `Allow: ${path}`),
    "",
    "User-agent: Google-Extended",
    "User-agent: Applebot-Extended",
    "Disallow: /",
    "",
    "User-agent: *",
    "Disallow: /",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n")
})
