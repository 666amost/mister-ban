<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
const route = useRoute()
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
