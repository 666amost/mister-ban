import { getRequestURL, sendRedirect, setResponseHeader } from "h3"
import { getPublicSiteOrigin } from "~/server/utils/public-seo"
import { isPublicPage, NOINDEX_ROBOTS } from "~/utils/public-seo"

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const indexable = useRuntimeConfig(event).public.siteIndexable
  const publicPage = isPublicPage(url.pathname)
  const publicResource = /^\/(?:_nuxt|brand)\//.test(url.pathname)
    || ["/robots.txt", "/sitemap.xml", "/favicon.ico", "/favicon-48.png", "/apple-touch-icon.png"].includes(url.pathname)

  if (!indexable || (!publicPage && !publicResource)) {
    setResponseHeader(event, "X-Robots-Tag", NOINDEX_ROBOTS)
  }

  if (publicPage) {
    const canonicalOrigin = new URL(getPublicSiteOrigin(event))
    const alternateHostname = canonicalOrigin.hostname.startsWith("www.")
      ? canonicalOrigin.hostname.slice(4)
      : `www.${canonicalOrigin.hostname}`
    const canonicalPath = url.pathname.replace(/\/+$/, "") || "/"
    if (url.hostname === alternateHostname) {
      return sendRedirect(event, `${canonicalOrigin.origin}${canonicalPath}${url.search}`, 301)
    }
    if (canonicalPath !== url.pathname) {
      return sendRedirect(event, `${canonicalPath}${url.search}`, 301)
    }
  }
})
