<script setup lang="ts">
defineProps<{
  currentYear: number
}>()
</script>

<template>
  <footer class="pub-footer">
    <div class="pub-shell pub-footer-inner">
      <div>
        <div class="pub-footer-brand">Mister Ban</div>
        <p class="pub-footer-copy">Pilihan ban motor dari brand terpercaya untuk kebutuhan harian di Jakarta Barat dan Tangerang.</p>
      </div>
      <p class="pub-copyright">© {{ currentYear }} Mister Ban. Semua hak dilindungi.</p>
    </div>
  </footer>
</template>
