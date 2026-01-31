<script setup lang="ts">
type InventoryRow = {
  product_id: string
  sku: string
  name: string
  size: string
  brand: string
  qty_on_hand: number
  avg_unit_cost: number
  sell_price: number | null
}

const me = useMe()
await me.refresh()

const items = ref<InventoryRow[]>([])
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const q = ref("")

const adjustingId = ref<string | null>(null)
const adjQtyDelta = ref(0)
const adjUnitCost = ref<number | null>(null)
const adjNote = ref("")
const adjLoading = ref(false)
const adjError = ref<string | null>(null)

function rupiah(value: number) {
  return value.toLocaleString("id-ID")
}

function statusMessage(error: unknown) {
  if (!error || typeof error !== "object") return null
  const e = error as Record<string, unknown>
  return typeof e.statusMessage === "string" ? e.statusMessage : null
}

async function load() {
  isLoading.value = true
  errorMessage.value = null
  try {
    const res = await $fetch<{ items: InventoryRow[] }>("/api/inventory", { query: { q: q.value, limit: 200 } })
    items.value = res.items
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal memuat inventory"
  } finally {
    isLoading.value = false
  }
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
  adjLoading.value = true
  adjError.value = null
  try {
    await $fetch("/api/inventory/adjust", {
      method: "POST",
      body: {
        product_id: productId,
        qty_delta: adjQtyDelta.value,
        unit_cost: adjQtyDelta.value > 0 ? adjUnitCost.value ?? 0 : undefined,
        note: adjNote.value.trim().length ? adjNote.value.trim() : undefined,
      },
    })
    cancelAdjust()
    await load()
  } catch (error) {
    adjError.value = statusMessage(error) ?? "Gagal adjust stok"
  } finally {
    adjLoading.value = false
  }
}

await load()
</script>

<template>
  <div class="page">
    <section class="mb-card">
      <div class="row">
        <label class="field">
          <span>Cari</span>
          <input v-model="q" class="mb-input" placeholder="SKU / brand / nama..." @keydown.enter.prevent="load" />
        </label>
        <button class="mb-btn" :disabled="isLoading" @click="load">{{ isLoading ? "Loading..." : "Search" }}</button>
      </div>

      <div v-if="items.length" class="tableWrap">
        <table class="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nama</th>
              <th style="text-align: right">Qty</th>
              <th style="text-align: right">Avg Cost</th>
              <th style="text-align: right">Sell</th>
              <th v-if="me.user.value?.role === 'ADMIN'" style="width: 1%"></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="i in items" :key="i.product_id">
              <tr>
                <td class="mono">{{ i.sku }}</td>
                <td>
                  <div class="strong">{{ i.brand }} {{ i.name }}</div>
                  <div class="muted">{{ i.size }}</div>
                </td>
                <td style="text-align: right">{{ i.qty_on_hand }}</td>
                <td style="text-align: right">Rp {{ rupiah(i.avg_unit_cost) }}</td>
                <td style="text-align: right">Rp {{ rupiah(i.sell_price ?? 0) }}</td>
                <td v-if="me.user.value?.role === 'ADMIN'" style="text-align: right">
                  <button class="mb-btn" type="button" @click="startAdjust(i)">Adjust</button>
                </td>
              </tr>
              <tr v-if="me.user.value?.role === 'ADMIN' && adjustingId === i.product_id">
                <td :colspan="me.user.value?.role === 'ADMIN' ? 6 : 5">
                  <div class="adjRow">
                    <label class="field smallField">
                      <span>Qty Delta</span>
                      <input v-model.number="adjQtyDelta" class="mb-input" type="number" step="1" />
                    </label>
                    <label class="field smallField">
                      <span>Unit Cost (Rp)</span>
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
                    Tips: pakai Qty Delta <strong>+10</strong> untuk tambah stok, atau <strong>-1</strong> untuk koreksi stok.
                    Untuk tambah stok, isi Unit Cost supaya avg cost ter-update.
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div v-else class="empty">Tidak ada data.</div>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
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
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th,
td {
  padding: 10px 8px;
  border-bottom: 1px solid rgba(42, 58, 94, 0.5);
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
</style>
