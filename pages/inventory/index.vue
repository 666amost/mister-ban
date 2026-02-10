<script setup lang="ts">
import { onMounted } from "vue"

type InventoryRow = {
  product_id: string
  sku: string
  name: string
  size: string
  brand: string
  product_type: string
  qty_on_hand: number
  avg_unit_cost: number
  sell_price: number | null
}

type InventorySummary = {
  ban_qty: number
  sparepart_qty: number
  cairan_qty: number
  ban_dalam_qty: number
  oli_qty: number
}

type CategoryFilter = "BAN" | "SPAREPART" | "CAIRAN" | "BAN_DALAM" | "OLI" | null

const me = useMe()

const items = ref<InventoryRow[]>([])
const summary = ref<InventorySummary>({
  ban_qty: 0,
  sparepart_qty: 0,
  cairan_qty: 0,
  ban_dalam_qty: 0,
  oli_qty: 0,
})
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const q = ref("")
const pageLimit = ref(50)
const pageOffset = ref(0)
const currentPage = ref(1)
const hasMore = ref(true)
const pageInput = ref(1)
const categoryFilter = ref<CategoryFilter>(null)

const bulkMode = ref(false)
const bulkQtyDelta = ref(0)
const bulkUnitCost = ref(0)
const bulkNote = ref("")
const bulkSelected = ref<Set<string>>(new Set())
const bulkLoading = ref(false)
const bulkError = ref<string | null>(null)

const adjustingId = ref<string | null>(null)
const adjQtyDelta = ref(0)
const adjUnitCost = ref<number | null>(null)
const adjNote = ref("")
const adjLoading = ref(false)
const adjError = ref<string | null>(null)

function rupiah(value: number) {
  return value.toLocaleString("id-ID")
}

function formatNumber(value: number) {
  return value.toLocaleString("id-ID")
}

function statusMessage(error: unknown) {
  if (!error || typeof error !== "object") return null
  const e = error as Record<string, unknown>
  return typeof e.statusMessage === "string" ? e.statusMessage : null
}

function resetPaging() {
  pageOffset.value = 0
  currentPage.value = 1
  pageInput.value = 1
  hasMore.value = true
}

async function load(options?: { reset?: boolean }) {
  const reset = options?.reset ?? false
  if (reset) resetPaging()
  isLoading.value = true
  errorMessage.value = null
  try {
    const queryParams: Record<string, unknown> = {
      q: q.value,
      limit: pageLimit.value,
      offset: pageOffset.value,
    }
    if (categoryFilter.value) {
      queryParams.category_filter = categoryFilter.value
    }
    const res = await $fetch<{ items: InventoryRow[]; summary: InventorySummary }>("/api/inventory", {
      query: queryParams,
    })
    items.value = res.items
    summary.value = res.summary
    hasMore.value = res.items.length === pageLimit.value

    // selections are per-page to avoid accidental bulk adjust on hidden items
    if (bulkMode.value) bulkSelected.value = new Set()
    if (adjustingId.value && !res.items.some((i) => i.product_id === adjustingId.value)) cancelAdjust()
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal memuat inventory"
    summary.value = {
      ban_qty: 0,
      sparepart_qty: 0,
      cairan_qty: 0,
      ban_dalam_qty: 0,
      oli_qty: 0,
    }
  } finally {
    isLoading.value = false
  }
}

async function nextPage() {
  if (isLoading.value || !hasMore.value) return
  pageOffset.value += pageLimit.value
  currentPage.value += 1
  pageInput.value = currentPage.value
  await load()
}

async function prevPage() {
  if (isLoading.value || currentPage.value <= 1) return
  pageOffset.value = Math.max(0, pageOffset.value - pageLimit.value)
  currentPage.value = Math.max(1, currentPage.value - 1)
  pageInput.value = currentPage.value
  await load()
}

async function jumpToPage() {
  if (isLoading.value) return
  const target = Math.max(1, Math.floor(pageInput.value || 1))
  currentPage.value = target
  pageOffset.value = (target - 1) * pageLimit.value
  await load()
}

function clearSearch() {
  q.value = ""
  load({ reset: true })
}

function selectCategory(category: CategoryFilter) {
  if (categoryFilter.value === category) {
    categoryFilter.value = null
  } else {
    categoryFilter.value = category
  }
  load({ reset: true })
}

function startAdjust(row: InventoryRow) {
  adjustingId.value = row.product_id
  adjQtyDelta.value = 0
  adjUnitCost.value = row.avg_unit_cost ?? 0
  adjNote.value = ""
  adjError.value = null
}

function cancelAdjust() {
  adjustingId.value = null
  adjQtyDelta.value = 0
  adjUnitCost.value = null
  adjNote.value = ""
  adjError.value = null
}

async function submitAdjust(productId: string) {
  if (adjQtyDelta.value === 0) {
    adjError.value = "Qty Delta tidak boleh 0"
    return
  }
  adjLoading.value = true
  adjError.value = null
  try {
    const body: Record<string, unknown> = {
      product_id: productId,
      qty_delta: adjQtyDelta.value,
    }
    if (adjQtyDelta.value > 0 && adjUnitCost.value && adjUnitCost.value > 0) {
      body.unit_cost = adjUnitCost.value
    }
    if (adjNote.value.trim().length) {
      body.note = adjNote.value.trim()
    }
    await $fetch("/api/inventory/adjust", {
      method: "POST",
      body,
    })
    cancelAdjust()
    await load()
  } catch (error) {
    adjError.value = statusMessage(error) ?? "Gagal adjust stok"
  } finally {
    adjLoading.value = false
  }
}

function toggleBulkSelect(productId: string) {
  if (bulkSelected.value.has(productId)) {
    bulkSelected.value.delete(productId)
  } else {
    bulkSelected.value.add(productId)
  }
  bulkSelected.value = new Set(bulkSelected.value)
}

function toggleBulkSelectAll() {
  if (bulkSelected.value.size === items.value.length) {
    bulkSelected.value = new Set()
  } else {
    bulkSelected.value = new Set(items.value.map(i => i.product_id))
  }
}

async function submitBulkAdjust() {
  if (bulkSelected.value.size === 0 || bulkQtyDelta.value === 0) {
    bulkError.value = "Qty Delta tidak boleh 0"
    return
  }
  bulkLoading.value = true
  bulkError.value = null
  try {
    for (const productId of bulkSelected.value) {
      const body: Record<string, unknown> = {
        product_id: productId,
        qty_delta: bulkQtyDelta.value,
      }
      if (bulkQtyDelta.value > 0 && bulkUnitCost.value > 0) {
        body.unit_cost = bulkUnitCost.value
      }
      if (bulkNote.value.trim().length) {
        body.note = bulkNote.value.trim()
      }
      await $fetch("/api/inventory/adjust", {
        method: "POST",
        body,
      })
    }
    bulkMode.value = false
    bulkSelected.value = new Set()
    bulkQtyDelta.value = 0
    bulkUnitCost.value = 0
    bulkNote.value = ""
    await load()
  } catch (error) {
    bulkError.value = statusMessage(error) ?? "Gagal adjust stok massal"
  } finally {
    bulkLoading.value = false
  }
}

function cancelBulk() {
  bulkMode.value = false
  bulkSelected.value = new Set()
  bulkQtyDelta.value = 0
  bulkUnitCost.value = 0
  bulkNote.value = ""
  bulkError.value = null
}

onMounted(async () => {
  await load({ reset: true })
})
</script>

<template>
  <div class="page">
    <section class="mb-card">
      <div class="row">
        <label class="field">
          <span>Cari</span>
          <input v-model="q" class="mb-input" placeholder="SKU / brand / nama..." @keydown.enter.prevent="load({ reset: true })" />
        </label>
        <button class="mb-btn" :disabled="isLoading" @click="load({ reset: true })">{{ isLoading ? "Loading..." : "Search" }}</button>
        <button v-if="q.trim().length" class="mb-btn" :disabled="isLoading" @click="clearSearch">Clear</button>
        <button v-if="me.user.value?.role === 'ADMIN'" :class="bulkMode ? 'mb-btnDanger' : 'mb-btn'" @click="bulkMode ? cancelBulk() : bulkMode = true">
          {{ bulkMode ? "Cancel Bulk" : "Bulk Adjust" }}
        </button>
      </div>
    </section>

    <section class="mb-card">
      <div class="summaryGrid">
        <button 
          type="button" 
          :class="['summaryItem', { highlight: categoryFilter === null, active: categoryFilter === null }]"
          @click="selectCategory(null)"
        >
          <div class="summaryLabel">Semua</div>
          <div class="summaryValue">{{ formatNumber(summary.ban_qty + summary.sparepart_qty + summary.cairan_qty + summary.ban_dalam_qty + summary.oli_qty) }}</div>
        </button>
        <button 
          type="button" 
          :class="['summaryItem', { active: categoryFilter === 'BAN' }]"
          @click="selectCategory('BAN')"
        >
          <div class="summaryLabel">Total Qty Ban</div>
          <div class="summaryValue">{{ formatNumber(summary.ban_qty) }}</div>
        </button>
        <button 
          type="button" 
          :class="['summaryItem', { active: categoryFilter === 'SPAREPART' }]"
          @click="selectCategory('SPAREPART')"
        >
          <div class="summaryLabel">Total Qty Sparepart</div>
          <div class="summaryValue">{{ formatNumber(summary.sparepart_qty) }}</div>
        </button>
        <button 
          type="button" 
          :class="['summaryItem', { active: categoryFilter === 'CAIRAN' }]"
          @click="selectCategory('CAIRAN')"
        >
          <div class="summaryLabel">Total Qty Cairan</div>
          <div class="summaryValue">{{ formatNumber(summary.cairan_qty) }}</div>
        </button>
        <button 
          type="button" 
          :class="['summaryItem', { active: categoryFilter === 'BAN_DALAM' }]"
          @click="selectCategory('BAN_DALAM')"
        >
          <div class="summaryLabel">Total Qty Ban Dalam</div>
          <div class="summaryValue">{{ formatNumber(summary.ban_dalam_qty) }}</div>
        </button>
        <button 
          type="button" 
          :class="['summaryItem', { active: categoryFilter === 'OLI' }]"
          @click="selectCategory('OLI')"
        >
          <div class="summaryLabel">Total Qty Oli</div>
          <div class="summaryValue">{{ formatNumber(summary.oli_qty) }}</div>
        </button>
      </div>
    </section>

    <section v-if="bulkMode && me.user.value?.role === 'ADMIN'" class="mb-card">
      <div class="bulkHeader">
        <div>
          <div class="bulkTitle">Bulk Adjust</div>
          <div class="bulkSub">{{ bulkSelected.size }} item dipilih</div>
        </div>
      </div>
      <div class="bulkForm">
        <label class="field smallField">
          <span>Qty Delta</span>
          <input v-model.number="bulkQtyDelta" class="mb-input" type="number" step="1" placeholder="+10 atau -5" />
        </label>
        <label class="field smallField">
          <span title="Hanya berpengaruh saat tambah stok (Qty Delta positif)">Harga Beli (Rp)</span>
          <input v-model.number="bulkUnitCost" class="mb-input" type="number" min="0" step="1" />
        </label>
        <label class="field bulkNoteField">
          <span>Note</span>
          <input v-model="bulkNote" class="mb-input" placeholder="Optional" />
        </label>
        <button class="mb-btnPrimary" type="button" :disabled="bulkLoading || bulkSelected.size === 0" @click="submitBulkAdjust">
          {{ bulkLoading ? "Processing..." : `Apply to ${bulkSelected.size} items` }}
        </button>
        <span v-if="bulkError" class="errorInline">{{ bulkError }}</span>
      </div>
    </section>

    <section class="mb-card">
      <div v-if="items.length" class="tableWrap">
        <table class="table">
          <thead>
            <tr>
              <th v-if="bulkMode" style="width: 40px">
                <input type="checkbox" :checked="bulkSelected.size === items.length" @change="toggleBulkSelectAll()" />
              </th>
              <th>SKU</th>
              <th>Nama</th>
              <th style="text-align: right">Qty</th>
              <th v-if="me.user.value?.role === 'ADMIN'" style="text-align: right" title="Harga modal (rata-rata). Berubah saat tambah stok, tetap saat kurang stok.">Modal (Avg)</th>
              <th style="text-align: right">Harga Jual</th>
              <th v-if="me.user.value?.role === 'ADMIN' && !bulkMode" style="width: 1%"></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="i in items" :key="i.product_id">
              <tr>
                <td v-if="bulkMode" style="text-align: center">
                  <input type="checkbox" :checked="bulkSelected.has(i.product_id)" @change="toggleBulkSelect(i.product_id)" />
                </td>
                <td class="mono">{{ i.sku }}</td>
                <td>
                  <div class="strong">{{ i.brand }} {{ i.name }}</div>
                  <div class="muted">{{ i.size }}</div>
                </td>
                <td style="text-align: right">{{ i.qty_on_hand }}</td>
                <td v-if="me.user.value?.role === 'ADMIN'" style="text-align: right">Rp {{ rupiah(i.avg_unit_cost) }}</td>
                <td style="text-align: right">Rp {{ rupiah(i.sell_price ?? 0) }}</td>
                <td v-if="me.user.value?.role === 'ADMIN' && !bulkMode" style="text-align: right">
                  <button class="mb-btn" type="button" @click="startAdjust(i)">Adjust</button>
                </td>
              </tr>
              <tr v-if="me.user.value?.role === 'ADMIN' && adjustingId === i.product_id && !bulkMode">
                <td v-if="bulkMode"></td>
                <td :colspan="5">
                  <div class="adjRow">
                    <label class="field smallField">
                      <span>Qty Delta</span>
                      <input v-model.number="adjQtyDelta" class="mb-input" type="number" step="1" placeholder="+10 atau -5" />
                    </label>
                    <label class="field smallField">
                      <span title="Hanya berpengaruh saat tambah stok (Qty Delta positif)">Harga Beli (Rp)</span>
                      <input v-model.number="adjUnitCost" class="mb-input" type="number" min="0" step="1" />
                    </label>
                    <label class="field noteField">
                      <span>Note</span>
                      <input v-model="adjNote" class="mb-input" placeholder="Optional" />
                    </label>
                    <button class="mb-btnPrimary" type="button" :disabled="adjLoading" @click="submitAdjust(i.product_id)">
                      {{ adjLoading ? "Saving..." : "Save" }}
                    </button>
                    <button class="mb-btn" type="button" :disabled="adjLoading" @click="cancelAdjust">Cancel</button>
                    <span v-if="adjError" class="errorInline">{{ adjError }}</span>
                  </div>
                  <div class="hint">
                    <strong>Harga Modal (Avg Cost):</strong> Saat tambah stok (+), modal dihitung ulang. Saat kurang stok (-), modal tetap.
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div v-else class="empty">Tidak ada data.</div>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <div class="paginationBar">
        <div class="pager">
          <button class="mb-btn" :disabled="isLoading || currentPage <= 1" @click="prevPage">Prev</button>
          <button class="mb-btn" :disabled="isLoading || !hasMore" @click="nextPage">Next</button>
        </div>
        <div class="pageInput">
          <span>Page</span>
          <input v-model.number="pageInput" class="mb-input" type="number" min="1" step="1" @keydown.enter.prevent="jumpToPage" />
          <button class="mb-btn" :disabled="isLoading || pageInput === currentPage" @click="jumpToPage">Go</button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 16px;
}
.row {
  display: flex;
  gap: 12px;
  align-items: end;
  justify-content: space-between;
  flex-wrap: wrap;
}
.field {
  display: grid;
  gap: 6px;
  font-size: 12px;
  flex: 1;
  min-width: 240px;
}
.adjRow {
  display: flex;
  gap: 10px;
  align-items: end;
  flex-wrap: wrap;
  padding: 10px 0;
}
.smallField {
  min-width: 160px;
  flex: 0 1 200px;
}
.noteField {
  min-width: 220px;
  flex: 1 1 260px;
}
.hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--mb-muted);
}
.tableWrap {
  margin-top: 12px;
  overflow: auto;
}
.paginationBar {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.pager {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.pageInput {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--mb-muted);
}
.pageInput .mb-input {
  width: 90px;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th,
td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--mb-table-border);
}
th {
  text-align: left;
  color: var(--mb-muted);
  font-weight: 700;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
}
.strong {
  font-weight: 800;
}
.muted {
  margin-top: 4px;
  font-size: 12px;
  color: var(--mb-muted);
}
.empty {
  margin-top: 12px;
  border-radius: 12px;
  border: 1px dashed var(--mb-border2);
  padding: 14px;
  font-size: 13px;
  color: var(--mb-muted);
}
.error {
  margin: 12px 0 0;
  color: var(--mb-danger);
  font-size: 12px;
}
.errorInline {
  font-size: 12px;
  color: var(--mb-danger);
}
.bulkHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--mb-border2);
}
.bulkTitle {
  font-weight: 800;
}
.bulkSub {
  font-size: 12px;
  color: var(--mb-muted);
  margin-top: 4px;
}
.bulkForm {
  display: flex;
  gap: 12px;
  align-items: end;
  flex-wrap: wrap;
}
.bulkNoteField {
  flex: 1;
  min-width: 240px;
}
.summaryGrid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}
.summaryItem {
  border: 1px solid var(--mb-border2);
  border-radius: 12px;
  padding: 12px;
  background: var(--mb-surface);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  width: 100%;
}
.summaryItem.highlight {
  border-color: rgba(52, 199, 89, 0.35);
  background: rgba(52, 199, 89, 0.08);
}
.summaryItem.active {
  border-color: rgba(52, 199, 89, 0.65);
  background: rgba(52, 199, 89, 0.15);
  font-weight: 700;
}
.summaryLabel {
  font-size: 12px;
  color: var(--mb-muted);
}
.summaryValue {
  margin-top: 6px;
  font-size: 24px;
  line-height: 1.1;
  font-weight: 900;
}
</style>
