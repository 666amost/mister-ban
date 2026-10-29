<script setup lang="ts">
import { useFetch, useHead, useRequestURL, useSeoMeta } from "#imports"
import type { PublicBranchesResponse } from "~/types/public"
definePageMeta({ layout: "public", pageTransition: { name: "public-view", mode: "out-in" }, layoutTransition: false, viewTransition: true })
const { data, error } = await useFetch<PublicBranchesResponse>("/api/public/branches", {
  key: "public-branches", default: () => ({ branches: [], updatedAt: "" }),
})
const canonical = new URL("/cabang", useRequestURL().origin).href
useSeoMeta({ title: "Cabang & Lokasi Toko Ban | Mister Ban", description: "Temukan cabang Mister Ban di Jakarta dan Tangerang. Lihat alamat, jam operasional, kontak toko, dan petunjuk arah.", ogUrl: canonical })
useHead({ link: [{ rel: "canonical", href: canonical }] })
</script>

<template>
  <div class="public-inner-page">
    <div class="public-shell"><nav class="public-breadcrumb" aria-label="Breadcrumb"><NuxtLink to="/">Beranda</NuxtLink><span aria-hidden="true">/</span><span>Cabang</span></nav></div>
    <p v-if="error" class="public-system-note" role="status">Data cabang belum dapat dimuat. Silakan coba kembali beberapa saat lagi.</p>
    <PubBranches :branches="data?.branches ?? []" />
  </div>
</template>
