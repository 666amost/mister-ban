<script setup lang="ts">
defineProps<{ currentYear: number }>()
</script>

<template>
  <footer class="public-footer">
    <div class="public-shell public-footer__grid">
      <p>&copy; {{ currentYear }} <NuxtLink to="/">Mister Ban</NuxtLink><span>Spesialis ban motor.</span></p>
      <nav aria-label="Navigasi footer">
        <NuxtLink to="/cek-ban">Cek Ban</NuxtLink>
        <NuxtLink to="/merek">Pilihan Merek</NuxtLink>
        <NuxtLink to="/cabang">Cabang</NuxtLink>
      </nav>
    </div>
  </footer>
</template>
