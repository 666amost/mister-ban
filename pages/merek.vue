<script setup lang="ts">
import { useHead, useRequestURL, useSeoMeta } from "#imports"
import { brandCatalog } from "~/data/pubHomeData"
definePageMeta({ layout: "public", pageTransition: { name: "public-view", mode: "out-in" }, layoutTransition: false, viewTransition: true })
const canonical = new URL("/merek", useRequestURL().origin).href
useSeoMeta({ title: "Pilihan Merek & Ukuran Ban Motor | Mister Ban", description: "Lihat merek, tipe, dan ukuran ban motor di katalog Mister Ban. Cek stok sesuai motor sebelum mengunjungi cabang.", ogUrl: canonical })
useHead({ link: [{ rel: "canonical", href: canonical }] })
</script>

<template>
  <div class="public-inner-page">
    <div class="public-shell"><nav class="public-breadcrumb" aria-label="Breadcrumb"><NuxtLink to="/">Beranda</NuxtLink><span aria-hidden="true">/</span><span>Pilihan Merek</span></nav></div>
    <PubProducts :brand-catalog="brandCatalog" />
  </div>
</template>
