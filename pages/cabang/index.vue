<script setup lang="ts">
import { useFetch, useHead } from "#imports"
import { usePublicSeo } from "~/composables/usePublicSeo"
import { serializeJsonLd } from "~/utils/public-seo"
import type { PublicBranchesResponse } from "~/types/public"

definePageMeta({ layout: "public", pageTransition: { name: "public-view", mode: "out-in" }, layoutTransition: false, viewTransition: true })
const { siteUrl } = usePublicSeo({
  title: "Bengkel & Toko Ban Terdekat Jakarta Tangerang | Mister Ban",
  description: "Cari toko ban terdekat atau bengkel ban motor di Jakarta Barat dan Tangerang. Temukan cabang Mister Ban, cek alamat, jam buka, kontak, dan rute Google Maps.",
  path: "/cabang",
  breadcrumbs: [{ name: "Beranda", path: "/" }, { name: "Cabang", path: "/cabang" }],
})
const { data, error } = await useFetch<PublicBranchesResponse>("/api/public/branches", {
  key: "public-branches", default: () => ({ branches: [], updatedAt: "" }),
})
useHead(() => ({
  script: [{
    key: "public-branches",
    type: "application/ld+json",
    innerHTML: serializeJsonLd({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Cabang Mister Ban",
      itemListElement: (data.value?.branches ?? []).map((branch, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: branch.name,
        url: `${siteUrl}/cabang/${branch.slug}`,
      })),
    }),
  }],
}))
</script>

<template>
  <div class="public-inner-page">
    <div class="public-shell"><nav class="public-breadcrumb" aria-label="Breadcrumb"><NuxtLink to="/">Beranda</NuxtLink><span aria-hidden="true">/</span><span>Cabang</span></nav></div>
    <p v-if="error" class="public-system-note" role="status">Data cabang belum dapat dimuat. Silakan coba kembali beberapa saat lagi.</p>
    <PubBranches :branches="data?.branches ?? []" />
  </div>
</template>
