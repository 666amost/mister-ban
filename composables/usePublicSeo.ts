import { useHead, useRequestURL, useRuntimeConfig, useSeoMeta } from "#imports"
import { publicSiteOrigin, serializeJsonLd } from "~/utils/public-seo"

type PublicSeoOptions = {
  title: string
  description: string
  path: string
  breadcrumbs?: Array<{ name: string; path: string }>
}

export function usePublicSeo(options: PublicSeoOptions): { siteUrl: string; canonicalUrl: string } {
  const siteUrl = publicSiteOrigin(useRuntimeConfig().public.siteUrl, useRequestURL().origin)
  const canonicalUrl = `${siteUrl}${options.path}`
  const imageUrl = `${siteUrl}/brand/logo-512.png`

  useSeoMeta({
    title: options.title,
    description: options.description,
    ogTitle: options.title,
    ogDescription: options.description,
    ogType: "website",
    ogSiteName: "Mister Ban",
    ogLocale: "id_ID",
    ogUrl: canonicalUrl,
    ogImage: imageUrl,
    ogImageAlt: "Mister Ban - Spesialis Ban Motor",
    ogImageWidth: 512,
    ogImageHeight: 512,
    twitterCard: "summary",
    twitterTitle: options.title,
    twitterDescription: options.description,
    twitterImage: imageUrl,
    twitterImageAlt: "Mister Ban - Spesialis Ban Motor",
  })

  useHead({
    link: [{ rel: "canonical", href: canonicalUrl }],
    script: options.breadcrumbs?.length
      ? [{
          key: "public-breadcrumbs",
          type: "application/ld+json",
          innerHTML: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: options.breadcrumbs.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.name,
              item: `${siteUrl}${item.path}`,
            })),
          }),
        }]
      : [],
  })

  return { siteUrl, canonicalUrl }
}
