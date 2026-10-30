<script setup lang="ts">
import { useFetch } from "#imports"
import { usePublicSeo } from "~/composables/usePublicSeo"
import type { PublicBranchesResponse } from "~/types/public"
definePageMeta({ layout: "public", pageTransition: { name: "public-view", mode: "out-in" }, layoutTransition: false, viewTransition: true })
const route = useRoute()
const { data, error } = await useFetch<PublicBranchesResponse>("/api/public/branches", {
  key: "public-branches", default: () => ({ branches: [], updatedAt: "" }),
})
const preferredBranch = computed(() => data.value?.branches.find(branch => branch.code === route.query.cabang))
usePublicSeo({
  title: "Cek Ukuran & Stok Ban Motor | Mister Ban",
  description: "Cari ukuran ban depan dan belakang sesuai model motor matic, bebek, atau sport. Cek pilihan merek dan stok ban di cabang Mister Ban Jakarta dan Tangerang.",
  path: "/cek-ban",
  breadcrumbs: [{ name: "Beranda", path: "/" }, { name: "Cek Ban", path: "/cek-ban" }],
})
</script>

<template>
  <div class="public-inner-page public-finder-page">
    <div class="public-shell">
      <nav class="public-breadcrumb" aria-label="Breadcrumb"><NuxtLink to="/">Beranda</NuxtLink><span aria-hidden="true">/</span><span>Cek Ban</span></nav>
      <div class="public-finder-layout">
        <div class="public-page-intro">
          <p class="public-kicker">Cek ban</p>
          <h1>Temukan ban<br /> yang pas.</h1>
          <p>Mulai dari model motor atau ukuran ban. Pilih bannya, lalu temukan cabang yang memiliki stok.</p>
          <p v-if="preferredBranch" class="public-preferred-branch">Pilihan cabang: <strong>{{ preferredBranch.name }}</strong></p>
          <ol class="public-finder-guide"><li>Cari lewat motor atau ukuran ban.</li><li>Pilih tipe ban yang Anda inginkan.</li><li>Cek stok dan temukan cabang.</li></ol>
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
