<script setup lang="ts">
definePageMeta({ layout: "auth" })

type Store = { id: string; name: string };

const me = useMe();
const storeContext = useStoreContext();

const stores = ref<Store[]>([]);
const search = ref("");
const selectedStoreId = ref("");
const errorMessage = ref<string | null>(null);
const isLoading = ref(false);
const isSelecting = ref(false);

function statusMessage(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const e = error as Record<string, unknown>;
  return typeof e.statusMessage === "string" ? e.statusMessage : null;
}

await me.refresh();
if (me.user.value?.role === "STAFF") {
  await navigateTo("/");
}

await storeContext.refresh();

async function loadStores() {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    const res = await $fetch<{ stores: Store[] }>("/api/stores");
    stores.value = res.stores;
    selectedStoreId.value =
      storeContext.store.value?.id ?? selectedStoreId.value;
  } catch (error: unknown) {
    errorMessage.value = statusMessage(error) ?? "Gagal memuat daftar toko";
  } finally {
    isLoading.value = false;
  }
}

await loadStores();

const filteredStores = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return stores.value;
  return stores.value.filter((s) => s.name.toLowerCase().includes(q));
});

async function enterStore() {
  if (!selectedStoreId.value) return;
  isSelecting.value = true;
  errorMessage.value = null;
  try {
    await storeContext.select(selectedStoreId.value);
    await navigateTo("/");
  } catch (error: unknown) {
    errorMessage.value = statusMessage(error) ?? "Gagal memilih toko";
  } finally {
    isSelecting.value = false;
  }
}

async function logout() {
  await $fetch("/api/auth/logout", { method: "POST" });
  await navigateTo("/login");
}
</script>

<template>
  <main class="mb-page">
    <div class="mb-container">
      <AppHeader>
        <template #meta>
          {{ me.user.value?.email }} <span class="sep">•</span>
          {{ me.user.value?.role }}
          <template v-if="storeContext.store.value?.name">
            <span class="sep">•</span> {{ storeContext.store.value?.name }}
          </template>
        </template>
        <button class="mb-btn" @click="logout">Logout</button>
      </AppHeader>

      <section class="mb-card card">
      <div class="cardHead">
        <div>
          <h1 class="cardTitle">Pilih Toko</h1>
          <p class="cardSub">
            Pilih toko untuk masuk ke dashboard & menjalankan transaksi.
          </p>
        </div>
        <button class="mb-btn" :disabled="isLoading" @click="loadStores">
          {{ isLoading ? "Loading..." : "Refresh" }}
        </button>
      </div>

      <div class="controls">
        <label class="field">
          <span>Cari toko</span>
          <input
            v-model="search"
            class="mb-input"
            type="text"
            placeholder="Ketik nama toko..."
          />
        </label>
      </div>

      <div
        v-if="filteredStores.length"
        class="storeGrid"
        role="listbox"
        aria-label="Daftar toko"
      >
        <button
          v-for="s in filteredStores"
          :key="s.id"
          type="button"
          class="storeItem"
          :class="{ active: selectedStoreId === s.id }"
          role="option"
          :aria-selected="selectedStoreId === s.id"
          @click="selectedStoreId = s.id"
        >
          <div class="storeName">{{ s.name }}</div>
          <div class="storeHint">
            {{ selectedStoreId === s.id ? "Dipilih" : "Klik untuk pilih" }}
          </div>
        </button>
      </div>
      <div v-else class="empty">Belum ada toko. Jalankan seed data dulu.</div>

      <div class="actions">
        <div v-if="storeContext.store.value?.name" class="current">
          Toko saat ini: <strong>{{ storeContext.store.value?.name }}</strong>
        </div>
        <button
          class="mb-btnPrimary"
          :disabled="!selectedStoreId || isSelecting"
          @click="enterStore"
        >
          {{ isSelecting ? "Memproses..." : "Masuk Dashboard" }}
        </button>
      </div>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.sep {
  opacity: 0.7;
  padding: 0 6px;
}

.card {
  margin-top: 16px;
}
.cardHead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.cardTitle {
  margin: 0;
  font-size: 18px;
}
.cardSub {
  margin: 6px 0 0;
  font-size: 13px;
  opacity: 0.85;
}

.controls {
  margin-top: 14px;
  display: grid;
  gap: 10px;
}
.field {
  display: grid;
  gap: 6px;
  font-size: 12px;
}

.storeGrid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.storeItem {
  text-align: left;
  border-radius: 14px;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
  color: var(--mb-text);
  padding: 14px;
  cursor: pointer;
  transition:
    transform 120ms ease,
    border-color 120ms ease,
    box-shadow 120ms ease;
}
.storeItem:hover {
  transform: translateY(-1px);
  border-color: rgba(52, 199, 89, 0.55);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.08);
}
.storeItem.active {
  border-color: rgba(52, 199, 89, 0.9);
  box-shadow:
    0 0 0 3px rgba(52, 199, 89, 0.18),
    0 14px 40px rgba(0, 0, 0, 0.08);
}
.storeName {
  font-weight: 800;
  letter-spacing: 0.2px;
}
.storeHint {
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.8;
}
.empty {
  margin-top: 14px;
  border-radius: 12px;
  border: 1px dashed var(--mb-border2);
  padding: 14px;
  font-size: 13px;
  opacity: 0.9;
}

.actions {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.current {
  font-size: 13px;
  opacity: 0.85;
}
.error {
  margin: 12px 0 0;
  color: var(--mb-danger);
  font-size: 12px;
}
</style>
