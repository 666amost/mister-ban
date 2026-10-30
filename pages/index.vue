<script setup lang="ts">
import { computed } from "vue"
import { useFetch, useHead } from "#imports"
import { usePublicSeo } from "~/composables/usePublicSeo"
import { serializeJsonLd } from "~/utils/public-seo"
import type { PublicBranchesResponse } from "~/types/public"

definePageMeta({ layout: "public", pageTransition: { name: "public-view", mode: "out-in" }, layoutTransition: false, viewTransition: true })

const { siteUrl, canonicalUrl } = usePublicSeo({
  title: "Mister Ban | Bengkel Ban Motor & Toko Ban Terdekat",
  description: "Cari bengkel ban motor atau toko ban terdekat di Jakarta Barat dan Tangerang? Mister Ban melayani ganti dan pasang ban. Cek stok, lokasi, dan jam buka cabang.",
  path: "/",
})
const { data: branchData } = await useFetch<PublicBranchesResponse>("/api/public/branches", {
  key: "public-branches",
  default: () => ({ branches: [], updatedAt: "" }),
})
const branches = computed(() => branchData.value?.branches ?? [])

useHead({
  script: [{
    key: "public-site",
    type: "application/ld+json",
    innerHTML: serializeJsonLd({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `${siteUrl}/#organization`,
          name: "Mister Ban",
          description: "Bengkel dan toko ban motor untuk ganti serta pasang ban di Jakarta Barat dan Tangerang.",
          url: canonicalUrl,
          logo: `${siteUrl}/brand/logo-512.png`,
          areaServed: ["Jakarta Barat", "Tangerang"],
        },
        {
          "@type": "WebSite",
          "@id": `${siteUrl}/#website`,
          name: "Mister Ban",
          description: "Temukan bengkel dan toko ban Mister Ban terdekat, cek stok ban motor, alamat, dan jam buka cabang.",
          url: canonicalUrl,
          inLanguage: "id-ID",
          publisher: { "@id": `${siteUrl}/#organization` },
        },
      ],
    }),
  }],
})
</script>

<template>
  <div class="public-home">
    <!-- Keep old fragment targets valid until the layout redirects their bookmarks. -->
    <span v-for="anchor in ['cek-ban', 'merek', 'cabang']" :id="anchor" :key="anchor" class="public-legacy-anchor" aria-hidden="true" />
    <PubHero :branches="branches" />
  </div>
</template>
