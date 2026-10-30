export const PUBLIC_PAGE_PATHS = ["/", "/cek-ban", "/merek", "/cabang"] as const

export const INDEX_ROBOTS = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
export const NOINDEX_ROBOTS = "noindex, nofollow"

export function isPublicPage(path: string): boolean {
  const normalizedPath = path.replace(/\/+$/, "") || "/"
  return PUBLIC_PAGE_PATHS.some((page) => page === normalizedPath) || /^\/cabang\/[^/]+$/.test(normalizedPath)
}

export function publicSiteOrigin(configuredUrl: string, requestOrigin: string): string {
  const url = new URL(configuredUrl || requestOrigin)
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("NUXT_PUBLIC_SITE_URL must be an http(s) website URL")
  }
  return url.origin
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c")
}
