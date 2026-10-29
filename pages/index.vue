<script setup lang="ts">
import { computed } from "vue"
import { useFetch, useHead, useRequestURL, useSeoMeta } from "#imports"
import type { PublicBranchesResponse } from "~/types/public"

definePageMeta({ layout: "public", pageTransition: { name: "public-view", mode: "out-in" }, layoutTransition: false, viewTransition: true })

const requestUrl = useRequestURL()
const canonicalUrl = `${requestUrl.origin}/`
const { data: branchData } = await useFetch<PublicBranchesResponse>("/api/public/branches", {
  key: "public-branches",
  default: () => ({ branches: [], updatedAt: "" }),
})

const branches = computed(() => branchData.value?.branches ?? [])

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
  <div class="public-home">
    <!-- Keep old fragment targets valid until the layout redirects their bookmarks. -->
    <span v-for="anchor in ['cek-ban', 'merek', 'cabang']" :id="anchor" :key="anchor" class="public-legacy-anchor" aria-hidden="true" />
    <PubHero :branches="branches" />
  </div>
</template>
