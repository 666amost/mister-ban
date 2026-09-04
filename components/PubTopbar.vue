<script setup lang="ts">
import { ref } from "vue"

const menuOpen = ref(false)

function closeMenu(): void {
  menuOpen.value = false
}
</script>

<template>
  <header class="public-header">
    <div class="public-shell public-header__inner">
      <NuxtLink to="/" class="public-brand" aria-label="Mister Ban - Beranda" @click="closeMenu">
        <img src="/brand/logo-160.png" width="44" height="44" alt="" class="public-brand__logo" />
        <span>
          <strong>Mister Ban</strong>
          <small>Spesialis ban motor</small>
        </span>
      </NuxtLink>

      <button
        type="button"
        class="public-menu-toggle"
        :class="{ 'is-open': menuOpen }"
        :aria-expanded="menuOpen"
        aria-controls="public-navigation"
        :aria-label="menuOpen ? 'Tutup navigasi' : 'Buka navigasi'"
        @click="menuOpen = !menuOpen"
      >
        <span />
        <span />
        <span />
      </button>

      <nav id="public-navigation" class="public-nav" :class="{ 'is-open': menuOpen }" aria-label="Navigasi utama">
        <a href="/#cek-ban" @click="closeMenu">Cek Ban</a>
        <a href="/#merek" @click="closeMenu">Pilihan Merek</a>
        <a href="/#cabang" @click="closeMenu">Cabang</a>
        <a href="/#cek-ban" class="public-button public-button--small" @click="closeMenu">Cari Ban Saya</a>
      </nav>
    </div>
  </header>
</template>
