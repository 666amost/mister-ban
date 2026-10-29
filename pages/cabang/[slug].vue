<script setup lang="ts">
import { createError, useFetch, useHead, useRequestURL, useSeoMeta } from "#imports"
import type { PublicBranch, PublicBranchesResponse } from "~/types/public"

definePageMeta({ layout: "public", pageTransition: { name: "public-view", mode: "out-in" }, layoutTransition: false, viewTransition: true })

const route = useRoute()
const requestUrl = useRequestURL()
const { data, error } = await useFetch<PublicBranchesResponse>("/api/public/branches", {
  key: "public-branches",
  default: () => ({ branches: [], updatedAt: "" }),
})

if (error.value) {
  throw createError({ statusCode: 503, statusMessage: "Data cabang belum dapat dimuat" })
}

const branch = data.value?.branches.find((item) => item.slug === route.params.slug)
if (!branch) {
  throw createError({ statusCode: 404, statusMessage: "Cabang tidak ditemukan" })
}

const canonicalUrl = `${requestUrl.origin}/cabang/${branch.slug}`
const contactUrl = buildContactUrl(branch)
const contactLabel = branch.whatsapp ? "Tanya via WhatsApp" : branch.instagram ? "Tanya via Instagram" : "Lihat Maps"

useSeoMeta({
  title: `${branch.name} | Toko Ban Motor Mister Ban`,
  description: `Cek ban sesuai motor, alamat, jam operasional, dan petunjuk arah ke ${branch.name}, ${branch.city}.`,
  ogTitle: `${branch.name} | Mister Ban`,
  ogDescription: `Cek pilihan ban sebelum datang ke ${branch.name}.`,
  ogType: "website",
  ogUrl: canonicalUrl,
  ogImage: `${requestUrl.origin}/brand/logo-512.png`,
  twitterCard: "summary",
  robots: "index, follow",
})

useHead({
  link: [{ rel: "canonical", href: canonicalUrl }],
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "AutomotiveBusiness",
        name: branch.name,
        url: canonicalUrl,
        image: `${requestUrl.origin}/brand/logo-512.png`,
        address: {
          "@type": "PostalAddress",
          streetAddress: branch.address,
          addressLocality: branch.city,
          addressCountry: "ID",
        },
        hasMap: branch.mapsUrl,
        sameAs: branch.instagram
          ? [`https://instagram.com/${branch.instagram.replace(/^@/, "")}`]
          : undefined,
      }),
    },
  ],
})

function buildContactUrl(item: PublicBranch): string {
  if (item.whatsapp) {
    const message = `Halo ${item.name}, saya ingin konsultasi ban motor sebelum datang ke toko.`
    return `https://wa.me/${item.whatsapp}?text=${encodeURIComponent(message)}`
  }
  if (item.instagram) return `https://instagram.com/${item.instagram.replace(/^@/, "")}`
  return item.mapsUrl
}
</script>

<template>
  <div class="public-branch-page">

    <section class="public-branch-hero">
      <div class="public-shell">
        <nav class="public-breadcrumb" aria-label="Breadcrumb">
          <NuxtLink to="/">Beranda</NuxtLink><span aria-hidden="true">/</span><NuxtLink to="/cabang">Cabang</NuxtLink><span aria-hidden="true">/</span><span>{{ branch.name }}</span>
        </nav>

        <div class="public-branch-hero__grid">
          <div>
            <p class="public-eyebrow">Cabang {{ branch.city }}</p>
            <h1>{{ branch.name }}</h1>
            <p class="public-branch-address">{{ branch.address }}</p>
            <div class="public-branch-actions">
              <NuxtLink :to="{ path: '/cek-ban', query: { cabang: branch.code } }" class="public-button">Cek ban di cabang ini</NuxtLink>
              <a :href="branch.mapsUrl" target="_blank" rel="noreferrer" class="public-button">Petunjuk arah</a>
              <a v-if="branch.whatsapp || branch.instagram" :href="contactUrl" target="_blank" rel="noreferrer" class="public-button is-secondary">{{ contactLabel }}</a>
            </div>
          </div>

          <aside class="public-branch-info-card">
            <span>Informasi toko</span>
            <h2>Jam operasional</h2>
            <ul v-if="branch.operatingHours.length">
              <li v-for="hours in branch.operatingHours" :key="hours">{{ hours }}</li>
            </ul>
            <p v-else>Hubungi cabang untuk memastikan jam operasional hari ini.</p>
          </aside>
        </div>
      </div>
    </section>

  </div>
</template>
