<script setup lang="ts">
import { computed } from "vue"
import { useFetch, useHead } from "#imports"
import { usePublicSeo } from "~/composables/usePublicSeo"
import { serializeJsonLd } from "~/utils/public-seo"
import type { PublicBranchesResponse } from "~/types/public"

definePageMeta({ layout: "public", pageTransition: { name: "public-view", mode: "out-in" }, layoutTransition: false, viewTransition: true })

const { siteUrl, canonicalUrl } = usePublicSeo({
  title: "Toko Ban Motor di Jakarta & Tangerang | Mister Ban",
  description: "Mister Ban, spesialis ban motor di Jakarta Barat dan Tangerang. Cek ukuran ban sesuai motor, pilihan merek, stok, serta alamat dan jam buka cabang terdekat.",
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
          url: canonicalUrl,
          logo: `${siteUrl}/brand/logo-512.png`,
          areaServed: ["Jakarta Barat", "Tangerang"],
        },
        {
          "@type": "WebSite",
          "@id": `${siteUrl}/#website`,
          name: "Mister Ban",
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
