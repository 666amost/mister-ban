import { getRequestURL, setResponseHeader } from "h3"

export default defineEventHandler((event) => {
  const origin = getRequestURL(event).origin
  setResponseHeader(event, "content-type", "text/plain; charset=utf-8")
  setResponseHeader(event, "cache-control", "public, max-age=3600, s-maxage=86400")
  return [`User-agent: *`, `Allow: /`, `Disallow: /admin/`, `Disallow: /api/`, `Sitemap: ${origin}/sitemap.xml`].join("\n")
})
