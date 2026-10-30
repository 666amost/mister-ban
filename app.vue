<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRuntimeConfig, useSeoMeta } from "#imports"
import { INDEX_ROBOTS, NOINDEX_ROBOTS } from "~/utils/public-seo"
const route = useRoute()
const config = useRuntimeConfig()
useSeoMeta({ robots: () => config.public.siteIndexable && route.meta.layout === "public" ? INDEX_ROBOTS : NOINDEX_ROBOTS })
const nativeTransitions = ref(false)
onMounted(() => { nativeTransitions.value = typeof document.startViewTransition === "function" })
const pageTransition = computed(() =>
  ["public", "default"].includes(String(route.meta.layout ?? "default")) && nativeTransitions.value && route.meta.viewTransition !== false
    ? false
    : route.meta.pageTransition ?? { name: (route.meta.layout ?? "default") === "default" ? "erp-page" : "page", mode: "out-in" as const },
)
</script>

<template>
  <NuxtLayout>
    <NuxtPage :transition="pageTransition" />
  </NuxtLayout>
</template>
