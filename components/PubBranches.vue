<script setup lang="ts">
import type { PublicBranch } from "~/types/public"

defineProps<{
  branches: PublicBranch[]
}>()

function instagramUrl(handle: string): string {
  return `https://instagram.com/${handle.replace(/^@/, "")}`
}

function contactLink(branch: PublicBranch): string {
  if (branch.whatsapp) {
    const message = `Halo ${branch.name}, saya ingin konsultasi ban motor sebelum datang ke toko.`
    return `https://wa.me/${branch.whatsapp}?text=${encodeURIComponent(message)}`
  }
  return branch.instagram ? instagramUrl(branch.instagram) : branch.mapsUrl
}

function contactLabel(branch: PublicBranch): string {
  if (branch.whatsapp) return "WhatsApp"
  if (branch.instagram) return "Instagram"
  return "Lihat Maps"
}
</script>

<template>
  <section id="cabang" class="public-section public-branches-section">
    <div class="public-shell">
      <div class="public-section-heading public-section-heading--split">
        <div>
          <p class="public-kicker">Lokasi toko</p>
          <h1>Cabang Mister Ban.</h1>
          <p>Jakarta &amp; Tangerang. Cek jam buka, hubungi tim toko, lalu tentukan rute Anda.</p>
        </div>
        <NuxtLink to="/cek-ban" class="public-text-link">Cek stok berdasarkan motor <span aria-hidden="true">→</span></NuxtLink>
      </div>

      <p v-if="!branches.length" class="public-branches-empty" role="status">Informasi cabang belum tersedia. Silakan muat ulang halaman beberapa saat lagi.</p>
      <div v-else class="public-branch-grid">
        <article v-for="branch in branches" :key="branch.code" class="public-branch-card">
          <div class="public-branch-card__top">
            <span>{{ branch.city }}</span>
            <NuxtLink :to="`/cabang/${branch.slug}`">Detail cabang</NuxtLink>
          </div>
          <h3>{{ branch.name }}</h3>
          <p>{{ branch.address }}</p>
          <div v-if="branch.operatingHours.length" class="public-hours">
            <span>Jam operasional</span>
            <strong>{{ branch.operatingHours.join(" · ") }}</strong>
          </div>
          <div class="public-branch-card__actions">
            <a :href="branch.mapsUrl" target="_blank" rel="noreferrer">Petunjuk arah</a>
            <a v-if="branch.whatsapp || branch.instagram" :href="contactLink(branch)" target="_blank" rel="noreferrer">{{ contactLabel(branch) }}</a>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
