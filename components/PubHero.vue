<script setup lang="ts">
import PubTireShowcase from "~/components/PubTireShowcase.vue"
import type { PublicBranch } from "~/types/public"
defineProps<{ branches: PublicBranch[] }>()
</script>

<template>
  <section class="public-hero" aria-labelledby="home-heading">
    <div class="public-shell public-hero__grid">
      <div class="public-hero__copy">
        <p class="public-eyebrow">Spesialis ban motor &middot; Jakarta &amp; Tangerang</p>
        <h1 id="home-heading"><span class="hero-title-line"><span>Ban yang pas.</span></span><span class="hero-title-line"><span>Siap <em>jalan lagi.</em></span></span></h1>
        <p class="public-hero__lead">Temukan ban yang sesuai dengan motor Anda. Cek pilihannya, hubungi toko, lalu datang untuk pemasangan.</p>
        <div class="public-hero__actions">
          <NuxtLink to="/cek-ban" class="public-button">Cari ban saya <span aria-hidden="true">&#8594;</span></NuxtLink>
          <NuxtLink to="/cabang" class="public-hero__branch-link">Temukan cabang</NuxtLink>
        </div>
        <p class="public-hero__footnote"><span v-if="branches.length">{{ branches.length }} cabang di Jakarta &amp; Tangerang.</span> Untuk motor matic, bebek, dan sport.</p>
      </div>
      <PubTireShowcase />
    </div>
  </section>
</template>
