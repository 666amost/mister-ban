<script setup lang="ts">
import type { PublicBranch } from "~/types/public"

defineProps<{
  branches: PublicBranch[]
}>()
</script>

<template>
  <section class="public-hero">
    <div class="public-shell public-hero__grid">
      <div class="public-hero__copy">
        <h1>Cari ban sesuai motor Anda.</h1>
        <p class="public-hero__lead">
          Pilih motor, pilih ban depan atau belakang, lalu lihat cabang yang memiliki stok.
        </p>
        <ul class="public-proof-list" aria-label="Keunggulan Mister Ban">
          <li><strong>31</strong><span>model motor populer</span></li>
          <li><strong>{{ branches.length }}</strong><span>cabang aktif</span></li>
          <li><strong>Stok Ban</strong><span>diperbarui berkala</span></li>
        </ul>
      </div>

      <PubSizeFinder :branches="branches" />
    </div>
  </section>
</template>
