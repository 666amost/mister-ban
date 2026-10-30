<script setup lang="ts">
import { createError, useFetch, useHead } from "#imports"
import { usePublicSeo } from "~/composables/usePublicSeo"
import { serializeJsonLd } from "~/utils/public-seo"
import type { PublicBranch, PublicBranchesResponse } from "~/types/public"

definePageMeta({ layout: "public", pageTransition: { name: "public-view", mode: "out-in" }, layoutTransition: false, viewTransition: true })

const route = useRoute()
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

const { siteUrl, canonicalUrl } = usePublicSeo({
  title: `${branch.name} | Bengkel Ban Motor ${branch.city || "Jakarta & Tangerang"}`,
  description: `Cari bengkel ban motor di ${branch.city || "Jakarta Barat dan Tangerang"}? Kunjungi ${branch.name} untuk ganti dan pasang ban. Cek stok, alamat, jam buka, serta rute toko.`,
  path: `/cabang/${branch.slug}`,
  breadcrumbs: [
    { name: "Beranda", path: "/" },
    { name: "Cabang", path: "/cabang" },
    { name: branch.name, path: `/cabang/${branch.slug}` },
  ],
})
const contactUrl = buildContactUrl(branch)
const contactLabel = branch.whatsapp ? "Tanya via WhatsApp" : branch.instagram ? "Tanya via Instagram" : "Lihat Maps"

useHead({
  script: [{
    key: "public-branch",
    type: "application/ld+json",
    innerHTML: serializeJsonLd({
      "@context": "https://schema.org",
      "@type": "AutomotiveBusiness",
      "@id": `${canonicalUrl}#store`,
      name: branch.name,
      description: `Bengkel dan toko ban motor ${branch.name} untuk ganti serta pasang ban.`,
      url: canonicalUrl,
      image: `${siteUrl}/brand/logo-512.png`,
      address: {
        "@type": "PostalAddress",
        streetAddress: branch.address,
        addressLocality: branch.city || undefined,
        addressCountry: "ID",
      },
      telephone: branch.whatsapp ? `+${branch.whatsapp}` : undefined,
      geo: branch.latitude !== null && branch.longitude !== null
        ? { "@type": "GeoCoordinates", latitude: branch.latitude, longitude: branch.longitude }
        : undefined,
      hasMap: branch.mapsUrl,
      parentOrganization: { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "Mister Ban", url: `${siteUrl}/` },
      sameAs: branch.instagram ? [`https://instagram.com/${branch.instagram.replace(/^@/, "")}`] : undefined,
    }),
  }],
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
