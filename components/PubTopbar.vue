<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue"
import type { NavGroup } from "~/types/public"

const props = defineProps<{
  navGroups: NavGroup[]
}>()

const activeNavId = ref<string | null>(null)
let closeNavTimer: ReturnType<typeof setTimeout> | null = null

const activeNav = computed<NavGroup | null>(() => {
  return props.navGroups.find((group) => group.id === activeNavId.value) ?? null
})

function openNav(navId: string): void {
  cancelCloseNav()
  activeNavId.value = navId
}

function closeNav(): void {
  cancelCloseNav()
  activeNavId.value = null
}

function scheduleCloseNav(): void {
  cancelCloseNav()
  closeNavTimer = setTimeout(() => {
    activeNavId.value = null
    closeNavTimer = null
  }, 180)
}

function cancelCloseNav(): void {
  if (closeNavTimer) {
    clearTimeout(closeNavTimer)
    closeNavTimer = null
  }
}

onBeforeUnmount(() => {
  cancelCloseNav()
})
</script>

<template>
  <header class="pub-topbar">
    <div class="pub-shell pub-topbar-inner">
      <NuxtLink to="/" class="pub-brand">
        <img class="pub-brand-logo" src="/brand/logo.png" alt="Mister Ban" />
        <span class="pub-brand-copy">
          <strong>Mister Ban</strong>
          <span>Spesialis ban motor. 7 cabang aktif.</span>
        </span>
      </NuxtLink>

      <div class="pub-nav-wrap" @mouseenter="cancelCloseNav" @mouseleave="scheduleCloseNav" @keydown.esc="closeNav">
        <nav class="pub-nav" aria-label="Public navigation">
          <button
            v-for="group in navGroups"
            :key="group.id"
            type="button"
            class="pub-nav-link"
            :class="{ 'is-active': group.id === activeNavId }"
            @mouseenter="openNav(group.id)"
            @focus="openNav(group.id)"
          >
            {{ group.label }}
          </button>
        </nav>

        <Transition name="pub-menu">
          <div v-if="activeNav" class="pub-menu-panel" @mouseenter="cancelCloseNav" @mouseleave="scheduleCloseNav">
            <div class="pub-menu-grid">
              <div class="pub-menu-copy">
                <div class="pub-menu-eyebrow">{{ activeNav.eyebrow }}</div>
                <h2 class="pub-menu-title">{{ activeNav.title }}</h2>
                <p class="pub-menu-desc">{{ activeNav.description }}</p>
              </div>

              <div class="pub-menu-links">
                <a v-for="item in activeNav.items" :key="item.label" class="pub-menu-link" :href="item.href" @click="closeNav">
                  <span class="pub-menu-link-copy">
                    <strong>{{ item.label }}</strong>
                    <span>{{ item.meta }}</span>
                  </span>
                  <span class="pub-menu-link-arrow">→</span>
                </a>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <div class="pub-topbar-actions">
        <span class="pub-search">7 Cabang Aktif</span>
      </div>
    </div>
  </header>
</template>
