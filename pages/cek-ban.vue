<script setup lang="ts">
import { useFetch, useHead, useRequestURL, useSeoMeta } from "#imports"
import type { PublicBranchesResponse } from "~/types/public"
definePageMeta({ layout: "public", pageTransition: { name: "public-view", mode: "out-in" }, layoutTransition: false, viewTransition: true })
const route = useRoute()
const { data, error } = await useFetch<PublicBranchesResponse>("/api/public/branches", {
  key: "public-branches", default: () => ({ branches: [], updatedAt: "" }),
})
const preferredBranch = computed(() => data.value?.branches.find(branch => branch.code === route.query.cabang))
const canonical = new URL("/cek-ban", useRequestURL().origin).href
useSeoMeta({ title: "Cek Ukuran & Stok Ban Motor | Mister Ban", description: "Pilih motor Anda untuk melihat ukuran ban depan dan belakang, pilihan ban, dan stok di cabang Mister Ban.", ogUrl: canonical })
useHead({ link: [{ rel: "canonical", href: canonical }] })
</script>

<template>
  <div class="public-inner-page public-finder-page">
    <div class="public-shell">
      <nav class="public-breadcrumb" aria-label="Breadcrumb"><NuxtLink to="/">Beranda</NuxtLink><span aria-hidden="true">/</span><span>Cek Ban</span></nav>
      <div class="public-finder-layout">
        <div class="public-page-intro">
          <p class="public-kicker">Cek ban</p>
          <h1>Mulai dari<br /> motor Anda.</h1>
          <p>Lihat ukuran ban depan dan belakang, pilih ban, lalu cek cabang yang memiliki stok.</p>
          <p v-if="preferredBranch" class="public-preferred-branch">Pilihan cabang: <strong>{{ preferredBranch.name }}</strong></p>
          <ol class="public-finder-guide"><li>Pilih model motor.</li><li>Tentukan depan atau belakang.</li><li>Pilih tipe ban yang sesuai.</li><li>Temukan cabang tujuan Anda.</li></ol>
          <NuxtLink to="/cabang" class="public-text-link">Lihat semua cabang <span aria-hidden="true">&#8594;</span></NuxtLink>
        </div>
        <div>
          <p v-if="error" class="public-system-note" role="status">Data cabang belum dapat dimuat. Anda tetap dapat melihat ukuran ban sesuai motor.</p>
          <PubSizeFinder :branches="data?.branches ?? []" :preferred-branch-code="preferredBranch?.code ?? ''" />
        </div>
      </div>
    </div>
  </div>
</template>
