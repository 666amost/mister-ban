<script setup lang="ts">
type IconName =
  | "home"
  | "sales"
  | "inventory"
  | "products"
  | "suppliers"
  | "reports"
  | "users"
  | "import"

defineProps<{ name: IconName }>()
</script>

<template>
  <svg
    v-if="name === 'home'"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M3 11l9-8 9 8" />
    <path d="M9 22V12h6v10" />
  </svg>

  <svg
    v-else-if="name === 'sales'"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M6 2h12v20l-2-1-2 1-2-1-2 1-2-1-2 1z" />
    <path d="M9 6h6" />
    <path d="M9 10h6" />
    <path d="M9 14h4" />
  </svg>

  <svg
    v-else-if="name === 'inventory'"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M21 8l-9-5-9 5v10l9 5 9-5z" />
    <path d="M3 8l9 5 9-5" />
    <path d="M12 13v10" />
  </svg>

  <svg
    v-else-if="name === 'products'"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </svg>

  <svg
    v-else-if="name === 'suppliers'"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M3 16V6a2 2 0 0 1 2-2h10v12H3z" />
    <path d="M15 8h4l2 3v5h-6V8z" />
    <circle cx="7.5" cy="18.5" r="1.5" />
    <circle cx="17.5" cy="18.5" r="1.5" />
  </svg>

  <svg
    v-else-if="name === 'reports'"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M3 3v18h18" />
    <path d="M7 14l4-4 4 4 5-6" />
  </svg>

  <svg
    v-else-if="name === 'users'"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>

  <svg
    v-else
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5-5 5 5" />
    <path d="M12 15V5" />
  </svg>
</template>
