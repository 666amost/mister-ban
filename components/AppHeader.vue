<script setup lang="ts">
type Props = {
  title?: string
  subtitle?: string
  meta?: string
  storeName?: string | null
}

defineProps<Props>()
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <img class="logo" src="/brand/logo.png" alt="Mister Ban" />
      <div class="text">
        <div class="appTitle">{{ title ?? "Mister Ban ERP" }}</div>
        <div class="appMeta">
          <slot name="meta">
            <template v-if="meta">{{ meta }}</template>
            <template v-else>
              <span v-if="subtitle">{{ subtitle }}</span>
              <template v-if="storeName">
                <span class="sep">&middot;</span>
                <span class="store">{{ storeName }}</span>
              </template>
            </template>
          </slot>
        </div>
      </div>
    </div>
    <div class="actions">
      <slot />
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.logo {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface);
  object-fit: cover;
  flex: 0 0 auto;
}
.text {
  min-width: 0;
}
.appTitle {
  font-weight: 900;
  letter-spacing: 0.2px;
  line-height: 1.1;
}
.appMeta {
  font-size: 12px;
  color: var(--mb-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70vw;
}
.sep {
  opacity: 0.7;
  padding: 0 6px;
}
.store {
  color: var(--mb-pill-text);
}
.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
