<script setup lang="ts">
import { usePublicSeo } from "~/composables/usePublicSeo"
import { brandCatalog } from "~/data/pubHomeData"

definePageMeta({ layout: "public", pageTransition: { name: "public-view", mode: "out-in" }, layoutTransition: false, viewTransition: true })
usePublicSeo({
  title: "Pilihan Merek & Ukuran Ban Motor | Mister Ban",
  description: "Lihat katalog ban motor IRC, Maxxis, Kingland, Zeneos, FDR, Pirelli, dan merek lainnya di Mister Ban. Pilih tipe dan ukuran, lalu cek stok cabang terdekat.",
  path: "/merek",
  breadcrumbs: [{ name: "Beranda", path: "/" }, { name: "Pilihan Merek", path: "/merek" }],
})
</script>

<template>
  <div class="public-inner-page">
    <div class="public-shell"><nav class="public-breadcrumb" aria-label="Breadcrumb"><NuxtLink to="/">Beranda</NuxtLink><span aria-hidden="true">/</span><span>Pilihan Merek</span></nav></div>
    <PubProducts :brand-catalog="brandCatalog" />
  </div>
</template>
