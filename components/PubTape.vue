<script setup lang="ts">
defineProps<{
  words: string[]
}>()
</script>

<template>
  <section class="pub-tape" aria-label="Product themes">
    <div class="pub-tape-track" aria-hidden="true">
      <span v-for="word in words" :key="`a-${word}`" class="pub-tape-word">{{ word }}</span>
      <span v-for="word in words" :key="`b-${word}`" class="pub-tape-word">{{ word }}</span>
    </div>
  </section>
</template>
