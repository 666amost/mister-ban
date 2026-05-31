<script setup lang="ts">
import type { TechCard } from "~/types/public"

defineProps<{
  techCards: TechCard[]
}>()
</script>

<template>
  <section id="teknologi" class="pub-section">
    <div class="pub-shell">
      <div class="pub-section-head">
        <div class="pub-kicker">Layanan Kami</div>
        <h2 class="pub-heading">Belanja ban motor jadi lebih mudah.</h2>
        <p class="pub-body">
          Pilih brand yang sesuai, cek cabang terdekat, lalu datang untuk konsultasi ukuran dan ketersediaan ban.
        </p>
      </div>

      <div class="pub-tech-grid">
        <article v-for="card in techCards" :key="card.title" class="pub-tech-card">
          <h3 class="pub-tech-title">{{ card.title }}</h3>
          <p class="pub-tech-desc">{{ card.description }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
