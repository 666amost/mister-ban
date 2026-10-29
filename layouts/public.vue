<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from "vue"
import { navigateTo, useHead, useNuxtApp } from "#imports"
import "~/assets/css/public-site.css"

useHead({
  htmlAttrs: { "data-public-site": "true" },
  bodyAttrs: { "data-public-site": "true" },
})

// Hashes are unavailable during SSR. Redirect old bookmarks only after hydration.
const route = useRoute()
onMounted(() => {
  const legacyPages: Record<string, string> = { "#cek-ban": "/cek-ban", "#merek": "/merek", "#cabang": "/cabang" }
  watch(() => route.fullPath, () => {
    const destination = legacyPages[route.hash]
    if (route.path === "/" && destination) void navigateTo(destination, { replace: true })
  }, { immediate: true })
})

const nuxtApp = useNuxtApp()
const removeFocusHook = nuxtApp.hook("page:finish", () => {
  document.querySelector<HTMLElement>("#public-content")?.focus({ preventScroll: true })
})
onBeforeUnmount(removeFocusHook)
</script>

<template>
  <div class="public-page public-site">
    <a class="public-skip-link" href="#public-content">Langsung ke konten</a>
    <PubTopbar />
    <main id="public-content" tabindex="-1"><slot /></main>
    <PubFooter :current-year="new Date().getFullYear()" />
  </div>
</template>
