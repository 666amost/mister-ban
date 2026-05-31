<script setup lang="ts">
import type { HeroMetric } from "~/types/public"

defineProps<{
  metrics: HeroMetric[]
}>()
</script>

<template>
  <section class="pub-metrics">
    <div class="pub-shell pub-metric-grid">
      <article v-for="metric in metrics" :key="metric.value" class="pub-metric-card">
        <div class="pub-metric-value">{{ metric.value }}</div>
        <p class="pub-metric-label">{{ metric.label }}</p>
      </article>
    </div>
  </section>
</template>
