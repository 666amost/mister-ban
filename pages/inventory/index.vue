<script setup lang="ts">
import { onMounted } from "vue"

definePageMeta({ middleware: "admin" })

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
  max_stock: number | null
  last_adj_at: string | null
  last_adj_qty_delta: number | null
  last_adj_by: string | null
  price_updated_at: string | null
  price_updated_by: string | null
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
const storeCtx = useStoreContext()

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

const priceEditMode = ref(false)
const priceDrafts = ref<Record<string, number>>({})
const priceDirty = ref<Set<string>>(new Set())
const priceSaveLoading = ref(false)
const priceSaveError = ref<string | null>(null)

const lowStockOnly = ref(false)
const lowStockCount = ref(0)

const maxStockEditMode = ref(false)
const maxStockDrafts = ref<Record<string, number | null>>({})
const maxStockDirty = ref<Set<string>>(new Set())
const maxStockSaveLoading = ref(false)
const maxStockSaveError = ref<string | null>(null)
const exportingPdf = ref(false)
const showBrandPicker = ref(false)
const brandPickerLoading = ref(false)
const brandPickerAllItems = ref<LowStockExportRow[]>([])

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

function formatDate(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })
    + " "
    + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

function productDisplayName(brand: string, name: string) {
  const brandTrimmed = brand.trim()
  const nameTrimmed = name.trim()

  if (!brandTrimmed) return nameTrimmed
  if (!nameTrimmed) return brandTrimmed

  const brandNormalized = normalizeText(brandTrimmed)
  const nameNormalized = normalizeText(nameTrimmed)
  if (nameNormalized === brandNormalized || nameNormalized.startsWith(`${brandNormalized} `)) {
    return nameTrimmed
  }
  return `${brandTrimmed} ${nameTrimmed}`.replace(/\s+/g, " ").trim()
}

function statusMessage(error: unknown) {
  if (!error || typeof error !== "object") return null
  const e = error as Record<string, unknown>
  return typeof e.statusMessage === "string" ? e.statusMessage : null
}

function resetPriceDrafts() {
  priceDrafts.value = Object.fromEntries(items.value.map((i) => [i.product_id, i.sell_price ?? 0])) as Record<string, number>
  priceDirty.value = new Set()
}

function startPriceEditMode() {
  cancelAdjust()
  priceEditMode.value = true
  priceSaveError.value = null
  resetPriceDrafts()
}

function cancelPriceEditMode() {
  priceEditMode.value = false
  priceDrafts.value = {}
  priceDirty.value = new Set()
  priceSaveError.value = null
}

function startMaxStockEditMode() {
  cancelAdjust()
  cancelPriceEditMode()
  maxStockEditMode.value = true
  maxStockSaveError.value = null
  maxStockDrafts.value = Object.fromEntries(items.value.map((i) => [i.product_id, i.max_stock])) as Record<string, number | null>
  maxStockDirty.value = new Set()
}

function cancelMaxStockEditMode() {
  maxStockEditMode.value = false
  maxStockDrafts.value = {}
  maxStockDirty.value = new Set()
  maxStockSaveError.value = null
}

function syncMaxStockDraft(productId: string) {
  const rawValue = maxStockDrafts.value[productId]
  const normalized = rawValue === null || rawValue === undefined || rawValue === 0 ? null : (Number.isFinite(rawValue) ? Math.max(0, Math.trunc(rawValue)) : null)
  maxStockDrafts.value[productId] = normalized
  const original = items.value.find((i) => i.product_id === productId)?.max_stock ?? null
  if (normalized === original) {
    maxStockDirty.value.delete(productId)
  } else {
    maxStockDirty.value.add(productId)
  }
  maxStockDirty.value = new Set(maxStockDirty.value)
}

async function saveAllMaxStockEdits() {
  if (maxStockDirty.value.size === 0) return
  maxStockSaveLoading.value = true
  maxStockSaveError.value = null
  try {
    const payload = Array.from(maxStockDirty.value).map((pid) => ({
      product_id: pid,
      max_stock: maxStockDrafts.value[pid] ?? null,
    }))
    await $fetch("/api/inventory/max-stock", {
      method: "POST",
      body: { items: payload },
    })
    cancelMaxStockEditMode()
    await load()
  } catch (error) {
    maxStockSaveError.value = statusMessage(error) ?? "Gagal simpan max stock"
  } finally {
    maxStockSaveLoading.value = false
  }
}

function toggleLowStock() {
  lowStockOnly.value = !lowStockOnly.value
  load({ reset: true })
}

function syncPriceDraft(productId: string) {
  const rawValue = priceDrafts.value[productId] ?? 0
  const normalized = Number.isFinite(rawValue) ? Math.max(0, Math.trunc(rawValue)) : 0
  priceDrafts.value[productId] = normalized
  const original = items.value.find((i) => i.product_id === productId)?.sell_price ?? 0
  if (normalized === original) {
    priceDirty.value.delete(productId)
  } else {
    priceDirty.value.add(productId)
  }
  priceDirty.value = new Set(priceDirty.value)
}

async function saveAllPriceEdits() {
  if (priceDirty.value.size === 0) return
  priceSaveLoading.value = true
  priceSaveError.value = null
  try {
    for (const productId of priceDirty.value) {
      await $fetch(`/api/products/${productId}`, {
        method: "PATCH",
        body: { sell_price: priceDrafts.value[productId] ?? 0 },
      })
    }
    cancelPriceEditMode()
    await load()
  } catch (error) {
    priceSaveError.value = statusMessage(error) ?? "Gagal simpan perubahan harga"
  } finally {
    priceSaveLoading.value = false
  }
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
    if (lowStockOnly.value) {
      queryParams.low_stock_only = "true"
    }
    const res = await $fetch<{ items: InventoryRow[]; summary: InventorySummary; lowStockCount: number }>("/api/inventory", {
      query: queryParams,
    })
    items.value = res.items
    summary.value = res.summary
    lowStockCount.value = res.lowStockCount ?? 0
    hasMore.value = res.items.length === pageLimit.value
    if (showBrandPicker.value) {
      showBrandPicker.value = false
      brandPickerAllItems.value = []
    }

    if (priceEditMode.value) resetPriceDrafts()
    if (maxStockEditMode.value) {
      maxStockDrafts.value = Object.fromEntries(res.items.map((i) => [i.product_id, i.max_stock])) as Record<string, number | null>
    }
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

async function clearAvgCost(productId: string) {
  adjLoading.value = true
  adjError.value = null
  try {
    const body: Record<string, unknown> = {
      product_id: productId,
      qty_delta: 0,
      reset_avg_cost: true,
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
    adjError.value = statusMessage(error) ?? "Gagal mengosongkan avg cost"
  } finally {
    adjLoading.value = false
  }
}

type LowStockExportRow = {
  product_id: string
  sku: string
  name: string
  size: string
  brand: string
  qty_on_hand: number
  max_stock: number
  qty_needed: number
}

function buildLowStockHtml(rows: LowStockExportRow[], storeName: string, brandFilter?: string): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })

  const grouped = new Map<string, LowStockExportRow[]>()
  for (const r of rows) {
    const brand = r.brand || "Lainnya"
    const list = grouped.get(brand)
    if (list) list.push(r)
    else grouped.set(brand, [r])
  }

  let sections = ""
  let grandTotal = 0
  for (const [brand, items] of grouped) {
    let brandTotal = 0
    let tableRows = ""
    for (let idx = 0; idx < items.length; idx++) {
      const r = items[idx]
      const displayName = productDisplayName(r.brand, r.name)
      brandTotal += r.qty_needed
      tableRows += `<tr><td class="c">${idx + 1}</td><td>${displayName} <span class="sub">${r.size}</span></td><td class="r b">${r.qty_needed}</td></tr>`
    }
    grandTotal += brandTotal
    sections += `<div class="bs">
      <div class="bh">${brand}<span class="bc">${items.length} item · sub: <b>${brandTotal}</b></span></div>
      <table><thead><tr><th class="c">#</th><th>Produk</th><th class="r">Order</th></tr></thead><tbody>${tableRows}</tbody></table>
    </div>`
  }

  const brandCount = grouped.size
  const gridCols = brandCount === 1 ? 1 : brandCount === 2 ? 2 : 3
  const singleBrand = brandCount === 1
  const bodyMaxWidth = singleBrand ? "max-width:400px;" : ""

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Restock ${brandFilter ? `- ${brandFilter}` : ""} - ${storeName}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;color:#1d1d1f;padding:14px 16px;${bodyMaxWidth}}
.hdr{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1.5px solid #1d1d1f;padding-bottom:6px;margin-bottom:10px}
.hdr h1{font-size:13px;font-weight:700}
.hdr p{font-size:10px;color:#86868b}
.grid{display:grid;grid-template-columns:repeat(${gridCols},1fr);gap:10px 14px;align-items:start}
.bs{break-inside:avoid}
.bh{font-size:11px;font-weight:700;padding:4px 0 3px;border-bottom:1px solid #1d1d1f;margin-bottom:1px;display:flex;gap:6px;align-items:baseline}
.bc{font-size:9px;font-weight:400;color:#86868b}
table{width:100%;border-collapse:collapse}
th{font-size:9px;font-weight:600;color:#86868b;padding:3px 3px;border-bottom:1px solid #d2d2d7;text-transform:uppercase;letter-spacing:0.03em;text-align:left}
td{padding:2px 3px;border-bottom:1px solid #f0f0f0;font-size:10px;line-height:1.3}
.c{text-align:center;color:#bbb;width:16px;font-size:9px}
.r{text-align:right}
.b{font-weight:700}
.red{color:#e00}
.sub{color:#86868b;font-size:9px}
.foot{margin-top:10px;padding-top:6px;border-top:1.5px solid #1d1d1f;display:flex;justify-content:flex-end;gap:10px;font-size:11px;font-weight:700}
.foot .red{color:#e00}
.actions{margin-top:12px}
.actions button{padding:5px 14px;font-size:11px;font-weight:600;border-radius:6px;cursor:pointer;border:none;background:#1d1d1f;color:#fff}
@media print{.actions{display:none!important}body{padding:8px 10px;max-width:none!important}.grid{gap:8px 12px}}
@media(max-width:700px){.grid{grid-template-columns:repeat(${Math.min(gridCols, 2)},1fr)}}
@media(max-width:420px){.grid{grid-template-columns:1fr}}
</style></head><body>
<div class="hdr">
  <h1>${storeName} — Restock${brandFilter ? ` · ${brandFilter}` : ""}</h1>
  <p>${dateStr}</p>
</div>
<div class="grid">${sections}</div>
<div class="foot"><span>Total Order</span><span class="red">${grandTotal}</span></div>
<div class="actions"><button onclick="window.print()">Print</button></div>
</body></html>`
}

async function exportLowStockPdf(brandFilter?: string) {
  exportingPdf.value = true
  showBrandPicker.value = false
  try {
    const params: Record<string, string> = {}
    if (categoryFilter.value) params.category_filter = categoryFilter.value
    if (brandFilter) params.brand_filter = brandFilter
    const res = await $fetch<{ items: LowStockExportRow[] }>("/api/inventory/low-stock", { query: params })
    if (res.items.length === 0) {
      errorMessage.value = "Tidak ada item stok rendah untuk diexport"
      return
    }
    const storeName = storeCtx.store.value?.name ?? "Toko"
    const html = buildLowStockHtml(res.items, storeName, brandFilter)
    const w = window.open("", "_blank")
    if (w) {
      w.document.write(html)
      w.document.close()
    }
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal export stok rendah"
  } finally {
    exportingPdf.value = false
  }
}

async function openBrandPicker() {
  showBrandPicker.value = true
  if (brandPickerAllItems.value.length > 0) return
  brandPickerLoading.value = true
  try {
    const params: Record<string, string> = {}
    if (categoryFilter.value) params.category_filter = categoryFilter.value
    const res = await $fetch<{ items: LowStockExportRow[] }>("/api/inventory/low-stock", { query: params })
    brandPickerAllItems.value = res.items
  } catch {
    brandPickerAllItems.value = []
  } finally {
    brandPickerLoading.value = false
  }
}

const brandPickerOptions = computed(() => {
  const map = new Map<string, number>()
  for (const r of brandPickerAllItems.value) {
    const b = r.brand || "Lainnya"
    map.set(b, (map.get(b) ?? 0) + 1)
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([brand, count]) => ({ brand, count }))
})

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
        <button
          :class="lowStockOnly ? 'mb-btnDanger' : 'mb-btn'"
          type="button"
          @click="toggleLowStock"
        >
          {{ lowStockOnly ? "Semua Stok" : `Stok Rendah (${lowStockCount})` }}
        </button>
        <button
          v-if="me.user.value?.role === 'ADMIN'"
          :class="maxStockEditMode ? 'mb-btnDanger' : 'mb-btn'"
          @click="maxStockEditMode ? cancelMaxStockEditMode() : startMaxStockEditMode()"
        >
          {{ maxStockEditMode ? "Batal Max Stock" : "Set Max Stock" }}
        </button>
        <button
          v-if="me.user.value?.role === 'ADMIN' && maxStockEditMode"
          class="mb-btnPrimary"
          type="button"
          :disabled="maxStockSaveLoading || maxStockDirty.size === 0"
          @click="saveAllMaxStockEdits"
        >
          {{ maxStockSaveLoading ? "Saving..." : `Save ${maxStockDirty.size} Max Stock` }}
        </button>
        <button
          v-if="me.user.value?.role === 'ADMIN'"
          :class="priceEditMode ? 'mb-btnDanger' : 'mb-btn'"
          @click="priceEditMode ? cancelPriceEditMode() : startPriceEditMode()"
        >
          {{ priceEditMode ? "Batal Edit Harga" : "Edit Harga" }}
        </button>
        <button
          v-if="me.user.value?.role === 'ADMIN' && priceEditMode"
          class="mb-btnPrimary"
          type="button"
          :disabled="priceSaveLoading || priceDirty.size === 0"
          @click="saveAllPriceEdits"
        >
          {{ priceSaveLoading ? "Saving..." : `Save ${priceDirty.size} Perubahan` }}
        </button>
      </div>
      <p v-if="priceEditMode && priceSaveError" class="error">{{ priceSaveError }}</p>
      <p v-if="maxStockEditMode && maxStockSaveError" class="error">{{ maxStockSaveError }}</p>
    </section>

    <section class="mb-card">
      <div class="summaryGrid">
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

    <section class="mb-card">
      <div v-if="items.length" class="tableWrap">
        <table class="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nama</th>
              <th style="text-align: right">Qty</th>
              <th style="text-align: right">Max Stock</th>
              <th v-if="me.user.value?.role === 'ADMIN'" style="text-align: right" title="Harga modal (rata-rata). Berubah saat tambah stok, tetap saat kurang stok.">Modal (Avg)</th>
              <th style="text-align: right">Harga Jual</th>
              <th v-if="me.user.value?.role === 'ADMIN'" style="width: 1%"></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="i in items" :key="i.product_id">
              <tr>
                <td class="mono">{{ i.sku }}</td>
                <td>
                  <div class="strong">{{ productDisplayName(i.brand, i.name) }}</div>
                  <div class="muted">{{ i.size }}</div>
                </td>
                <td style="text-align: right">
                  {{ i.qty_on_hand }}
                  <div v-if="me.user.value?.role === 'ADMIN' && i.last_adj_at" class="lastEditHint">
                    {{ i.last_adj_qty_delta !== null && i.last_adj_qty_delta > 0 ? '+' : '' }}{{ i.last_adj_qty_delta }} qty
                    • {{ formatDate(i.last_adj_at) }}
                  </div>
                </td>
                <td class="maxStockCell">
                  <template v-if="maxStockEditMode">
                    <input
                      v-model.number="maxStockDrafts[i.product_id]"
                      class="mb-input maxStockInput"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="—"
                      @input="syncMaxStockDraft(i.product_id)"
                    />
                  </template>
                  <template v-else>
                    <span v-if="i.max_stock !== null" :class="{ lowStockBadge: i.qty_on_hand < i.max_stock }">
                      {{ i.qty_on_hand }}/{{ i.max_stock }}
                      <span v-if="i.qty_on_hand < i.max_stock" class="qtyNeeded">
                        (-{{ i.max_stock - i.qty_on_hand }})
                      </span>
                    </span>
                    <span v-else class="muted">—</span>
                  </template>
                </td>
                <td v-if="me.user.value?.role === 'ADMIN'" style="text-align: right">
                  <template v-if="i.avg_unit_cost > 0">Rp {{ rupiah(i.avg_unit_cost) }}</template>
                  <template v-else>-</template>
                </td>
                <td style="text-align: right">
                  <template v-if="priceEditMode">
                    <input
                      v-model.number="priceDrafts[i.product_id]"
                      class="mb-input priceInput"
                      type="number"
                      min="0"
                      step="1"
                      @input="syncPriceDraft(i.product_id)"
                    />
                  </template>
                  <template v-else>
                    Rp {{ rupiah(i.sell_price ?? 0) }}
                    <div v-if="me.user.value?.role === 'ADMIN' && i.price_updated_at" class="lastEditHint">
                      {{ formatDate(i.price_updated_at) }}
                    </div>
                  </template>
                </td>
                <td v-if="me.user.value?.role === 'ADMIN'" style="text-align: right">
                  <button class="mb-btn" type="button" :disabled="priceEditMode" @click="startAdjust(i)">Adjust</button>
                </td>
              </tr>
              <tr v-if="me.user.value?.role === 'ADMIN' && adjustingId === i.product_id && !priceEditMode">
                <td :colspan="6">
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
                    <button class="mb-btn" type="button" :disabled="adjLoading" @click="clearAvgCost(i.product_id)">
                      Kosongkan Avg Cost
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
        <button
          v-if="lowStockCount > 0"
          class="mb-btnPrimary"
          type="button"
          :disabled="exportingPdf"
          @click="openBrandPicker"
        >
          {{ exportingPdf ? "Exporting..." : `Export Stok Rendah (${lowStockCount})` }}
        </button>
      </div>

      <div v-if="showBrandPicker" class="brandPicker">
        <div class="brandPickerHeader">
          <span class="brandPickerTitle">Pilih Merk</span>
          <button class="mb-btn brandPickerClose" type="button" @click="showBrandPicker = false; brandPickerAllItems = []">✕</button>
        </div>
        <div v-if="brandPickerLoading" class="brandPickerLoading">Memuat...</div>
        <div v-else class="brandPickerList">
          <button class="mb-btnPrimary brandPickerBtn" type="button" @click="exportLowStockPdf()">
            Semua Merk
          </button>
          <button
            v-for="opt in brandPickerOptions"
            :key="opt.brand"
            class="mb-btn brandPickerBtn"
            type="button"
            @click="exportLowStockPdf(opt.brand)"
          >
            {{ opt.brand }} <span class="brandPickerCount">({{ opt.count }})</span>
          </button>
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
.priceInput {
  width: 140px;
  margin-left: auto;
  text-align: right;
}
.hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--mb-muted);
}
.lastEditHint {
  margin-top: 3px;
  font-size: 11px;
  color: rgba(52, 199, 89, 0.9);
  font-weight: 400;
  font-style: italic;
  white-space: nowrap;
}
.tableWrap {
  margin-top: 12px;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
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
  width: max-content;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 760px;
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
.lowStockBadge {
  color: #ff6b6b;
  font-weight: 700;
}
.qtyNeeded {
  font-size: 11px;
  font-weight: 600;
}
.maxStockCell {
  text-align: right;
  white-space: nowrap;
}
.maxStockInput {
  width: 90px;
  margin-left: auto;
  text-align: right;
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

.brandPicker {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--mb-border2);
  border-radius: 12px;
  background: var(--mb-surface2);
}
.brandPickerHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.brandPickerTitle {
  font-size: 12px;
  font-weight: 700;
  color: var(--mb-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.brandPickerClose {
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
}
.brandPickerLoading {
  font-size: 12px;
  color: var(--mb-muted);
  padding: 4px 0;
}
.brandPickerList {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.brandPickerBtn {
  font-size: 12px;
  height: 32px;
  padding: 0 12px;
}
.brandPickerCount {
  opacity: 0.65;
  font-weight: 400;
  font-size: 11px;
}

@media (max-width: 900px) {
  .row {
    gap: 8px;
  }

  .field {
    min-width: 100%;
  }

  .row > .mb-btn,
  .row > .mb-btnPrimary,
  .row > .mb-btnDanger {
    flex: 1 1 calc(50% - 4px);
    min-width: 0;
  }

  .summaryGrid {
    gap: 8px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .summaryItem {
    padding: 10px;
  }

  .summaryValue {
    font-size: 20px;
  }

  .tableWrap {
    margin-left: -6px;
    margin-right: -6px;
    padding: 0 6px 2px;
  }

  .priceInput {
    width: 120px;
  }

  .paginationBar {
    align-items: stretch;
  }

  .pager,
  .pageInput {
    width: 100%;
    justify-content: space-between;
  }

  .pageInput .mb-input {
    width: 76px;
  }
}
</style>
