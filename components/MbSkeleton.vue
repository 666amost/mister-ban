<template>
  <div class="mb-skeleton-wrapper">
    <div v-for="i in count" :key="i" class="mb-skeleton-item" :style="{ height: height || '20px' }"></div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  count?: number
  height?: string
}>()
</script>

<style scoped>
.mb-skeleton-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mb-skeleton-item {
  width: 100%;
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    var(--mb-skeleton-from) 0%,
    var(--mb-skeleton-mid) 50%,
    var(--mb-skeleton-from) 100%
  );
  background-size: 200% 100%;
  animation: mb-skeleton 1.5s ease-in-out infinite;
}

@keyframes mb-skeleton {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
