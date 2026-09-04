<script setup lang="ts">
import { computed } from "vue"
import { useFetch, useHead, useRequestURL, useSeoMeta } from "#imports"
import { brandCatalog } from "~/data/pubHomeData"
import type { PublicBranchesResponse } from "~/types/public"

definePageMeta({ layout: "auth" })

const requestUrl = useRequestURL()
const canonicalUrl = `${requestUrl.origin}/`
const { data: branchData, error: branchError } = await useFetch<PublicBranchesResponse>("/api/public/branches", {
  key: "public-branches",
  default: () => ({ branches: [], updatedAt: "" }),
})

const branches = computed(() => branchData.value?.branches ?? [])
const currentYear = new Date().getFullYear()

useSeoMeta({
  title: "Cek Ban Motor Sesuai Kendaraan | Mister Ban",
  description:
    "Temukan ukuran ban depan dan belakang sesuai motor Anda, cek pilihan stok, lalu kunjungi cabang Mister Ban terdekat di Jakarta dan Tangerang.",
  ogTitle: "Cek Ban Motor Sesuai Kendaraan | Mister Ban",
  ogDescription:
    "Cek ukuran dan pilihan ban motor sebelum datang ke cabang Mister Ban terdekat.",
  ogType: "website",
  ogUrl: canonicalUrl,
  ogImage: `${requestUrl.origin}/brand/logo-512.png`,
  twitterCard: "summary",
  robots: "index, follow",
})

useHead(() => ({
  link: [{ rel: "canonical", href: canonicalUrl }],
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Mister Ban",
        url: canonicalUrl,
        logo: `${requestUrl.origin}/brand/logo-512.png`,
        areaServed: ["Jakarta Barat", "Tangerang"],
        department: branches.value.map((branch) => ({
          "@type": "AutomotiveBusiness",
          name: branch.name,
          address: branch.address,
          url: `${requestUrl.origin}/cabang/${branch.slug}`,
        })),
      }),
    },
  ],
}))
</script>

<template>
  <main class="public-page">
    <PubTopbar />

    <div v-if="branchError" class="public-system-note" role="status">
      Data cabang sedang diperbarui. Simulator ukuran tetap dapat digunakan.
    </div>

    <PubHero :branches="branches" />

    <section class="public-trust-strip" aria-label="Ringkasan layanan">
      <div class="public-shell">
        <span>Pilihan ban untuk motor matic, bebek, dan sport</span>
        <span aria-hidden="true">•</span>
        <span>Pengecekan akhir oleh tim toko</span>
        <span aria-hidden="true">•</span>
        <span>Cabang Jakarta dan Tangerang</span>
      </div>
    </section>

    <PubServices />
    <PubProducts :brand-catalog="brandCatalog" />
    <PubBranches :branches="branches" />
    <PubFooter :current-year="currentYear" />

    <nav class="public-mobile-actions" aria-label="Aksi cepat">
      <a href="#cek-ban">Cek Ban</a>
      <a href="#cabang">Cabang Terdekat</a>
    </nav>
  </main>
</template>
