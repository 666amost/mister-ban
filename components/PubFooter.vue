<script setup lang="ts">
defineProps<{ currentYear: number }>()
</script>

<template>
  <footer class="public-footer">
    <div class="public-shell public-footer__grid">
      <div>
        <NuxtLink to="/" class="public-brand public-brand--footer">
          <img src="/brand/logo-160.png" width="44" height="44" alt="" />
          <span><strong>Mister Ban</strong><small>Spesialis ban motor</small></span>
        </NuxtLink>
        <p>Ban motor dan pemasangan di Jakarta dan Tangerang.</p>
      </div>
      <nav aria-label="Navigasi footer">
        <a href="/#cek-ban">Cek Ban</a>
        <a href="/#merek">Pilihan Merek</a>
        <a href="/#cabang">Cabang</a>
      </nav>
      <p class="public-footer__copyright">© {{ currentYear }} Mister Ban. Semua hak dilindungi.</p>
    </div>
  </footer>
</template>
