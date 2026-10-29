<script setup lang="ts">
import { ref, watch } from "vue"
const route = useRoute()
const menuOpen = ref(false)
const menuButton = ref<HTMLButtonElement | null>(null)
const links = [
  { to: "/cek-ban", label: "Cek Ban" },
  { to: "/merek", label: "Pilihan Merek" },
  { to: "/cabang", label: "Cabang" },
]
function closeMenu(): void { menuOpen.value = false }
function dismissMenu(): void {
  if (!menuOpen.value) return
  closeMenu()
  menuButton.value?.focus()
}
watch(() => route.fullPath, closeMenu)
</script>

<template>
  <header class="public-header" @keydown.esc="dismissMenu" @focusout="(event) => { if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) closeMenu() }">
    <div class="public-shell public-header__inner">
      <NuxtLink to="/" class="public-brand" aria-label="Mister Ban - Beranda" @click="closeMenu">
        <img src="/brand/logo-160.png" width="44" height="44" alt="" class="public-brand__logo" />
        <span><strong>Mister Ban</strong><small>Spesialis ban motor</small></span>
      </NuxtLink>
      <button ref="menuButton" type="button" class="public-menu-toggle" :class="{ 'is-open': menuOpen }" :aria-expanded="menuOpen" aria-controls="public-navigation" :aria-label="menuOpen ? 'Tutup navigasi' : 'Buka navigasi'" @click="menuOpen = !menuOpen">
        <span /><span /><span />
      </button>
      <nav id="public-navigation" class="public-nav" :class="{ 'is-open': menuOpen }" aria-label="Navigasi utama">
        <NuxtLink v-for="link in links" :key="link.to" :to="link.to" :class="{ 'is-active': route.path === link.to || route.path.startsWith(link.to + '/') }" :aria-current="route.path === link.to ? 'page' : undefined" @click="closeMenu">{{ link.label }}</NuxtLink>
      </nav>
    </div>
  </header>
</template>
