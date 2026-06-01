<script setup lang="ts">
import { onMounted } from "vue";

definePageMeta({ layout: "auth" })

type Store = { id: string; name: string };
type StoreSummary = {
  store_id: string;
  store_name: string;
  omzet: number;
  profit: number;
  qty_ban: number;
};
type SummaryTab = "day" | "month";
type SummaryCache = Record<string, StoreSummary[]>;

const me = useMe();
const storeContext = useStoreContext();

const stores = ref<Store[]>([]);
const dailyStoreSummary = ref<StoreSummary[]>([]);
const monthlyStoreSummary = ref<StoreSummary[]>([]);
const dailySummaryCache = ref<SummaryCache>({});
const monthlySummaryCache = ref<SummaryCache>({});
const activeSummaryTab = ref<SummaryTab>("day");
const summaryDate = ref(new Date().toISOString().slice(0, 10));
const summaryMonth = ref(new Date().toISOString().slice(0, 7));
const isDailySummaryLoading = ref(false);
const isMonthlySummaryLoading = ref(false);
const isSummaryOpen = ref(false);
const search = ref("");
const selectedStoreId = ref("");
const errorMessage = ref<string | null>(null);
const isLoading = ref(false);
const isSelecting = ref(false);

const isCreateOpen = ref(false);
const isCreating = ref(false);
const createError = ref<string | null>(null);
const createForm = ref({
  name: "",
  code: "",
  address: "",
  city: "",
  source_store_id: "",
  copy_inventory: false,
});

const isDeleteOpen = ref(false);
const deleteSelectedId = ref("");
const deleteStep = ref<"select" | "confirm">("select");
const isDeleting = ref(false);
const deleteError = ref<string | null>(null);

const deleteTargetStore = computed(
  () => stores.value.find((s) => s.id === deleteSelectedId.value) ?? null,
);

function openDeleteModal() {
  deleteSelectedId.value = "";
  deleteStep.value = "select";
  deleteError.value = null;
  isDeleteOpen.value = true;
}

async function confirmDeleteStore() {
  if (!deleteSelectedId.value) return;
  isDeleting.value = true;
  deleteError.value = null;
  try {
    await $fetch(`/api/admin/stores/${deleteSelectedId.value}`, { method: "DELETE" });
    if (selectedStoreId.value === deleteSelectedId.value) selectedStoreId.value = "";
    isDeleteOpen.value = false;
    await loadStores();
  } catch (err: unknown) {
    deleteError.value = statusMessage(err) ?? "Gagal menghapus toko";
  } finally {
    isDeleting.value = false;
  }
}

function openCreateModal() {
  createForm.value = { name: "", code: "", address: "", city: "", source_store_id: "", copy_inventory: false };
  createError.value = null;
  isCreateOpen.value = true;
}

async function submitCreateStore() {
  if (!createForm.value.name.trim()) {
    createError.value = "Nama toko wajib diisi";
    return;
  }
  isCreating.value = true;
  createError.value = null;
  try {
    await $fetch("/api/admin/stores", {
      method: "POST",
      body: {
        name: createForm.value.name.trim(),
        code: createForm.value.code.trim() || null,
        address: createForm.value.address.trim() || null,
        city: createForm.value.city.trim() || null,
        source_store_id: createForm.value.source_store_id || null,
        copy_inventory: createForm.value.source_store_id ? createForm.value.copy_inventory : false,
      },
    });
    isCreateOpen.value = false;
    await loadStores();
  } catch (err: unknown) {
    createError.value = statusMessage(err) ?? "Gagal membuat toko";
  } finally {
    isCreating.value = false;
  }
}

function statusMessage(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const e = error as Record<string, unknown>;
  return typeof e.statusMessage === "string" ? e.statusMessage : null;
}

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

const activeSummaryStores = computed(() => {
  if (activeSummaryTab.value === "day") {
    return dailyStoreSummary.value;
  }

  return monthlyStoreSummary.value;
});

const activeSummaryLoading = computed(() => {
  if (activeSummaryTab.value === "day") {
    return isDailySummaryLoading.value;
  }

  return isMonthlySummaryLoading.value;
});

const activeSummaryDescription = computed(() => {
  if (activeSummaryTab.value === "day") {
    return "Ringkasan omzet, profit & transaksi semua toko pada tanggal terpilih.";
  }

  return "Ringkasan omzet, profit & transaksi semua toko pada bulan terpilih.";
});

const activeSummaryEmptyLabel = computed(() => {
  if (activeSummaryTab.value === "day") {
    return "Belum ada data penjualan pada tanggal ini.";
  }

  return "Belum ada data penjualan pada bulan ini.";
});

function getSummaryKey(tab: SummaryTab): string {
  return tab === "day" ? summaryDate.value : summaryMonth.value;
}

function hasCachedSummary(tab: SummaryTab, key: string): boolean {
  const cache = tab === "day" ? dailySummaryCache.value : monthlySummaryCache.value;
  return Object.prototype.hasOwnProperty.call(cache, key);
}

function getCachedSummary(tab: SummaryTab, key: string): StoreSummary[] | null {
  if (!hasCachedSummary(tab, key)) return null;
  const cache = tab === "day" ? dailySummaryCache.value : monthlySummaryCache.value;
  return cache[key] ?? null;
}

function applySummaryData(tab: SummaryTab, storesData: StoreSummary[]) {
  if (tab === "day") {
    dailyStoreSummary.value = storesData;
    return;
  }

  monthlyStoreSummary.value = storesData;
}

function cacheSummaryData(tab: SummaryTab, key: string, storesData: StoreSummary[]) {
  if (tab === "day") {
    dailySummaryCache.value = {
      ...dailySummaryCache.value,
      [key]: storesData,
    };
    dailyStoreSummary.value = storesData;
    return;
  }

  monthlySummaryCache.value = {
    ...monthlySummaryCache.value,
    [key]: storesData,
  };
  monthlyStoreSummary.value = storesData;
}

async function loadSummary(tab: SummaryTab) {
  const key = getSummaryKey(tab);
  const cachedSummary = getCachedSummary(tab, key);
  if (cachedSummary) {
    applySummaryData(tab, cachedSummary);
    return;
  }

  if (tab === "day") {
    isDailySummaryLoading.value = true;
  } else {
    isMonthlySummaryLoading.value = true;
  }

  try {
    const res = await $fetch<{ stores: StoreSummary[] }>(
      "/api/reports/stores-summary",
      {
        query:
          tab === "day"
            ? { period: "day", date: summaryDate.value }
            : { period: "month", month: summaryMonth.value },
      },
    );
    cacheSummaryData(tab, key, res.stores);
  } catch {
    cacheSummaryData(tab, key, []);
  } finally {
    if (tab === "day") {
      isDailySummaryLoading.value = false;
    } else {
      isMonthlySummaryLoading.value = false;
    }
  }
}

async function ensureSummaryLoaded(tab: SummaryTab) {
  await loadSummary(tab);
}

watch(summaryDate, () => {
  if (!isSummaryOpen.value || activeSummaryTab.value !== "day") return;
  loadSummary("day");
});

watch(summaryMonth, () => {
  if (!isSummaryOpen.value || activeSummaryTab.value !== "month") return;
  loadSummary("month");
});

watch(activeSummaryTab, (tab) => {
  if (!isSummaryOpen.value) return;
  ensureSummaryLoaded(tab);
});

watch(isSummaryOpen, (open) => {
  if (open) {
    ensureSummaryLoaded(activeSummaryTab.value);
  }
});

onMounted(async () => {
  await me.refresh();
  if (me.user.value?.role === "STAFF") {
    await navigateTo("/dashboard");
    return;
  }
  
  await storeContext.refresh();
  await loadStores();
});

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
    await navigateTo("/dashboard");
  } catch (error: unknown) {
    errorMessage.value = statusMessage(error) ?? "Gagal memilih toko";
    isSelecting.value = false;
  }
}

async function logout() {
  try {
    await $fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore network/api logout error, state tetap dibersihkan di client
  }
  me.clear();
  storeContext.clear();
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
        <div class="headActions">
          <button class="mb-btn" :disabled="isLoading" @click="loadStores">
            {{ isLoading ? "Loading..." : "Refresh" }}
          </button>
          <button class="mb-btnPrimary" @click="openCreateModal">+ Tambah Toko</button>
          <button class="mb-btnDanger isHidden" @click="openDeleteModal">Hapus Toko</button>
        </div>
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

      <Teleport to="body">
        <div v-if="isDeleteOpen" class="modalOverlay" @click.self="isDeleteOpen = false">
          <div class="modalBox" role="dialog" aria-modal="true" aria-labelledby="deleteModalTitle">
            <div class="modalHead">
              <h2 id="deleteModalTitle" class="cardTitle">Hapus Toko</h2>
              <button type="button" class="modalClose" aria-label="Tutup" @click="isDeleteOpen = false">✕</button>
            </div>

            <div v-if="deleteStep === 'select'" class="createForm">
              <label class="field">
                <span>Pilih toko yang akan dihapus</span>
                <select v-model="deleteSelectedId" class="mb-input">
                  <option value="">— Pilih toko —</option>
                  <option v-for="s in stores" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
              </label>
              <p class="deleteWarningNote">
                Toko hanya bisa dihapus jika belum memiliki transaksi penjualan atau penerimaan stok.
              </p>
              <div class="modalActions">
                <button type="button" class="mb-btn" @click="isDeleteOpen = false">Batal</button>
                <button
                  type="button"
                  class="mb-btnDanger"
                  :disabled="!deleteSelectedId"
                  @click="deleteStep = 'confirm'"
                >
                  Lanjut
                </button>
              </div>
            </div>

            <div v-else class="createForm">
              <div class="deleteConfirmBox">
                <div class="deleteConfirmStore">{{ deleteTargetStore?.name }}</div>
                <p class="deleteConfirmDesc">
                  Tindakan ini akan menghapus toko beserta seluruh data produk dan inventaris terkait secara permanen.
                  Data penjualan yang sudah ada tidak akan dihapus (toko hanya bisa dihapus jika belum ada transaksi).
                </p>
              </div>
              <p v-if="deleteError" class="error">{{ deleteError }}</p>
              <div class="modalActions">
                <button type="button" class="mb-btn" :disabled="isDeleting" @click="deleteStep = 'select'">Kembali</button>
                <button
                  type="button"
                  class="mb-btnDanger"
                  :disabled="isDeleting"
                  @click="confirmDeleteStore"
                >
                  {{ isDeleting ? "Menghapus..." : "Ya, Hapus Toko" }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isCreateOpen" class="modalOverlay" @click.self="isCreateOpen = false">
          <div class="modalBox" role="dialog" aria-modal="true" aria-labelledby="createModalTitle">
            <div class="modalHead">
              <h2 id="createModalTitle" class="cardTitle">Tambah Toko Baru</h2>
              <button type="button" class="modalClose" aria-label="Tutup" @click="isCreateOpen = false">✕</button>
            </div>
            <form class="createForm" @submit.prevent="submitCreateStore">
              <label class="field">
                <span>Nama Toko <span class="required">*</span></span>
                <input v-model="createForm.name" class="mb-input" type="text" placeholder="cth. Mister Ban Bekasi" required />
              </label>
              <label class="field">
                <span>Kode Toko</span>
                <input v-model="createForm.code" class="mb-input" type="text" placeholder="cth. MB-BKS" />
              </label>
              <label class="field">
                <span>Kota</span>
                <input v-model="createForm.city" class="mb-input" type="text" placeholder="cth. Bekasi" />
              </label>
              <label class="field">
                <span>Alamat</span>
                <input v-model="createForm.address" class="mb-input" type="text" placeholder="cth. Jl. Ahmad Yani No. 1" />
              </label>
              <label class="field">
                <span>Salin produk &amp; harga dari toko</span>
                <select v-model="createForm.source_store_id" class="mb-input">
                  <option value="">— Mulai kosong —</option>
                  <option v-for="s in stores" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
              </label>
              <label v-if="createForm.source_store_id" class="fieldCheck">
                <input v-model="createForm.copy_inventory" type="checkbox" />
                <span>Termasuk salin stok inventory</span>
              </label>
              <p v-if="createError" class="error">{{ createError }}</p>
              <div class="modalActions">
                <button type="button" class="mb-btn" :disabled="isCreating" @click="isCreateOpen = false">Batal</button>
                <button type="submit" class="mb-btnPrimary" :disabled="isCreating">
                  {{ isCreating ? "Menyimpan..." : "Simpan Toko" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Teleport>

      <section class="mb-card card">
        <button
          type="button"
          class="summaryToggle"
          :aria-expanded="isSummaryOpen"
          aria-controls="store-summary-panel"
          @click="isSummaryOpen = !isSummaryOpen"
        >
          <div>
            <h2 class="cardTitle">Perbandingan Toko</h2>
            <p class="cardSub">
              Klik untuk lihat ringkasan omzet, profit & transaksi semua toko.
            </p>
          </div>
          <span class="summaryToggleLabel">
            {{ isSummaryOpen ? "Tutup" : "Buka" }}
          </span>
        </button>

        <Transition name="collapse">
          <div
            v-if="isSummaryOpen"
            id="store-summary-panel"
            class="summaryContent"
          >
            <div class="cardHead">
              <div class="summaryPanelHead">
                <div class="summaryTabs" role="tablist" aria-label="Periode ringkasan toko">
                  <button
                    type="button"
                    class="summaryTab"
                    :class="{ active: activeSummaryTab === 'day' }"
                    role="tab"
                    :aria-selected="activeSummaryTab === 'day'"
                    @click="activeSummaryTab = 'day'"
                  >
                    Per Hari
                  </button>
                  <button
                    type="button"
                    class="summaryTab"
                    :class="{ active: activeSummaryTab === 'month' }"
                    role="tab"
                    :aria-selected="activeSummaryTab === 'month'"
                    @click="activeSummaryTab = 'month'"
                  >
                    Per Bulan
                  </button>
                </div>
                <p class="cardSub">
                  {{ activeSummaryDescription }}
                </p>
              </div>
              <input
                v-if="activeSummaryTab === 'day'"
                v-model="summaryDate"
                type="date"
                class="mb-input periodPicker"
              />
              <input
                v-else
                v-model="summaryMonth"
                type="month"
                class="mb-input periodPicker"
              />
            </div>

            <div v-if="activeSummaryLoading" class="chartLoading">
              <MbSkeleton style="height: 160px" />
            </div>
            <StoreComparisonChart
              v-else
              :stores="activeSummaryStores"
              :empty-label="activeSummaryEmptyLabel"
            />
          </div>
        </Transition>
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
.headActions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
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
.summaryToggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 14px;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
  color: var(--mb-text);
  text-align: left;
  padding: 12px 14px;
  cursor: pointer;
  transition:
    border-color 120ms ease,
    box-shadow 120ms ease;
}
.summaryToggle:hover {
  border-color: rgba(52, 199, 89, 0.55);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.08);
}
.summaryToggleLabel {
  border-radius: 999px;
  border: 1px solid var(--mb-border2);
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.summaryContent {
  margin-top: 12px;
}

.summaryPanelHead {
  display: grid;
  gap: 10px;
}

.summaryTabs {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.summaryTab {
  border-radius: 999px;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
  color: var(--mb-text);
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    border-color 120ms ease,
    box-shadow 120ms ease,
    transform 120ms ease;
}

.summaryTab:hover {
  transform: translateY(-1px);
  border-color: rgba(52, 199, 89, 0.5);
}

.summaryTab.active {
  border-color: rgba(52, 199, 89, 0.85);
  box-shadow: 0 0 0 2px rgba(52, 199, 89, 0.14);
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

.periodPicker {
  max-width: 180px;
  font-size: 13px;
}

.chartLoading {
  margin-top: 12px;
}

.required {
  color: var(--mb-danger);
}

.mb-btnDanger {
  border-radius: 10px;
  border: 1px solid var(--mb-danger);
  background: var(--mb-danger);
  color: #fff;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 120ms ease;
}
.mb-btnDanger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.isHidden {
  display: none;
}

.deleteWarningNote {
  font-size: 12px;
  opacity: 0.75;
  margin: 0;
}

.deleteConfirmBox {
  border-radius: 12px;
  border: 1px solid rgba(255, 59, 48, 0.35);
  background: rgba(255, 59, 48, 0.06);
  padding: 14px;
  display: grid;
  gap: 8px;
}
.deleteConfirmStore {
  font-size: 16px;
  font-weight: 800;
}
.deleteConfirmDesc {
  font-size: 12px;
  opacity: 0.8;
  margin: 0;
  line-height: 1.6;
}

.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}
.modalBox {
  background: var(--mb-surface);
  border: 1px solid var(--mb-border2);
  border-radius: 18px;
  padding: 24px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
}
.modalHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.modalClose {
  background: none;
  border: 1px solid var(--mb-border2);
  border-radius: 8px;
  color: var(--mb-text);
  cursor: pointer;
  padding: 4px 10px;
  font-size: 14px;
}
.createForm {
  display: grid;
  gap: 14px;
}
.fieldCheck {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  cursor: pointer;
}
.modalActions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.collapse-enter-active,
.collapse-leave-active {
  transition:
    max-height 180ms ease,
    opacity 180ms ease;
}
.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}
.collapse-enter-to,
.collapse-leave-from {
  max-height: 580px;
  opacity: 1;
  overflow: hidden;
}

@media (max-width: 640px) {
  .cardHead {
    flex-direction: column;
  }

  .periodPicker {
    max-width: 100%;
    width: 100%;
  }
}
</style>
