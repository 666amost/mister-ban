import { getRequestURL, type H3Event } from "h3"
import { publicSiteOrigin } from "~/utils/public-seo"

export function getPublicSiteOrigin(event: H3Event): string {
  return publicSiteOrigin(useRuntimeConfig(event).public.siteUrl, getRequestURL(event).origin)
}
