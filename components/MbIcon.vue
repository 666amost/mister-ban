<script setup lang="ts">
type IconName =
  | "home"
  | "sales"
  | "inventory"
  | "products"
  | "suppliers"
  | "reports"
  | "users"
  | "theme"
  | "import"

defineProps<{ name: IconName; active?: boolean }>()
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <template v-if="name === 'home'">
      <template v-if="active">
        <path fill-rule="evenodd" clip-rule="evenodd" fill="currentColor" stroke="none" d="M12 3L3 11V22H21V11L12 3Z M9 12H15V22H9Z" />
        <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M9 12L14 22" />
      </template>
      <template v-else>
        <path d="M3 11l9-8 9 8" />
        <path d="M9 22V12h6v10" />
      </template>
    </template>

    <template v-else-if="name === 'sales'">
      <template v-if="active">
        <path fill="currentColor" stroke="none" d="M6 2h12v20l-2-1-2 1-2-1-2 1-2-1-2 1z" />
        <path stroke="none" fill="none" d="" />
      </template>
      <template v-else>
        <path d="M6 2h12v20l-2-1-2 1-2-1-2 1-2-1-2 1z" />
        <path d="M9 6h6" />
        <path d="M9 10h6" />
        <path d="M9 14h4" />
      </template>
    </template>

    <template v-else-if="name === 'inventory'">
      <template v-if="active">
        <path fill="currentColor" stroke="none" d="M12 3L3 8V18L12 23L21 18V8L12 3Z" />
      </template>
      <template v-else>
        <path d="M21 8l-9-5-9 5v10l9 5 9-5z" />
        <path d="M3 8l9 5 9-5" />
        <path d="M12 13v10" />
      </template>
    </template>

    <template v-else-if="name === 'products'">
      <template v-if="active">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          fill="currentColor"
          stroke="none"
          d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7.5 6A1.5 1.5 0 1 0 7.5 9 1.5 1.5 0 0 0 7.5 6Z"
        />
      </template>
      <template v-else>
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <circle cx="7.5" cy="7.5" r="1.5" />
      </template>
    </template>

    <template v-else-if="name === 'suppliers'">
      <path d="M3 16V6a2 2 0 0 1 2-2h10v12H3z" />
      <path d="M15 8h4l2 3v5h-6V8z" />
      <circle cx="7.5" cy="18.5" r="1.5" />
      <circle cx="17.5" cy="18.5" r="1.5" />
    </template>

    <template v-else-if="name === 'reports'">
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 4 4 5-6" />
    </template>

    <template v-else-if="name === 'theme'">
      <path d="M12 3v2" />
      <path d="M12 19v2" />
      <path d="M4.22 4.22l1.42 1.42" />
      <path d="M18.36 18.36l1.42 1.42" />
      <path d="M3 12h2" />
      <path d="M19 12h2" />
      <path d="M4.22 19.78l1.42-1.42" />
      <path d="M18.36 5.64l1.42-1.42" />
      <circle cx="12" cy="12" r="4" />
    </template>

    <template v-else-if="name === 'users'">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </template>

    <template v-else>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5-5 5 5" />
      <path d="M12 15V5" />
    </template>
  </svg>
</template>
