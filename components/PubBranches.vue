<script setup lang="ts">
import type { PublicBranchCard } from "~/types/public"

defineProps<{
  branches: PublicBranchCard[]
}>()

function buildInstagramUrl(handle: string): string {
  return `https://instagram.com/${handle.replace(/^@/, "")}`
}
</script>

<template>
  <section id="jaringan" class="pub-section pub-section--accent">
    <div class="pub-shell pub-network-grid">
      <div class="pub-network-copy">
        <div class="pub-kicker">Cabang Kami</div>
        <h2 class="pub-heading">Datang ke cabang Mister Ban terdekat.</h2>
        <p class="pub-body">
          Setiap cabang siap membantu cek stok, ukuran, dan pilihan ban motor yang sesuai.
        </p>

        <div class="pub-network-actions">
          <a class="pub-btn pub-btn--primary" href="#produk">Lihat Pilihan Ban</a>
        </div>
      </div>

      <div class="pub-network-panel">
        <article v-for="branch in branches" :key="branch.title" class="pub-network-card">
          <div class="pub-branch-head">
            <div>
              <h3 class="pub-network-title">{{ branch.title }}</h3>
              <p class="pub-branch-area">Area {{ branch.area }}</p>
            </div>
          </div>
          <div v-if="branch.instagram" class="pub-branch-meta">
            <a
              class="pub-branch-link"
              :href="buildInstagramUrl(branch.instagram)"
              target="_blank"
              rel="noreferrer"
            >
              {{ branch.instagram }}
            </a>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
