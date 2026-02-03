<script setup lang="ts">
import { onMounted } from "vue"

definePageMeta({ middleware: "admin" })

type ProductRow = {
  product_id: string
  sku: string
  name: string
  size: string
  brand: string
  sell_price: number
  qty_on_hand: number
  avg_unit_cost: number
}

type MasterProductRow = {
  product_id: string
  sku: string
  name: string
  size: string
  brand: string
  product_type: string
}

const items = ref<ProductRow[]>([])
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const q = ref("")

const bulkMode = ref(false)
const bulkType = ref<'price' | 'stock'>('price')
const bulkSellPrice = ref(0)
const bulkQtyDelta = ref(0)
const bulkUnitCost = ref(0)
const bulkNote = ref('')
const bulkSelected = ref<Set<string>>(new Set())
const bulkLoading = ref(false)
const bulkError = ref<string | null>(null)

const showAdd = ref(false)
const addTab = ref<"new" | "master">("new")

const createForm = reactive({
  brand: "",
  product_type: "BAN",
  name: "",
  size: "",
  sku: "",
  sell_price: 0,
  initial_qty: 0,
  initial_unit_cost: 0,
  is_active: true,
})
const createLoading = ref(false)
const createError = ref<string | null>(null)

const masterQ = ref("")
const masterItems = ref<MasterProductRow[]>([])
const masterRan = ref(false)
const masterLoading = ref(false)
const masterError = ref<string | null>(null)
const selectedMaster = ref<MasterProductRow | null>(null)
const attachSellPrice = ref(0)
const attachInitialQty = ref(0)
const attachUnitCost = ref(0)
const attachLoading = ref(false)
const attachError = ref<string | null>(null)

const editingId = ref<string | null>(null)
const editSellPrice = ref(0)
const editLoading = ref(false)
const editError = ref<string | null>(null)

const editingMasterId = ref<string | null>(null)
const masterName = ref("")
const masterSize = ref("")
const masterEditLoading = ref(false)
const masterEditError = ref<string | null>(null)

const removingId = ref<string | null>(null)
const removeError = ref<string | null>(null)

const stockingId = ref<string | null>(null)
const stockQtyDelta = ref(0)
const stockUnitCost = ref(0)
const stockNote = ref("")
const stockLoading = ref(false)
const stockError = ref<string | null>(null)

function slugPart(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s/-]+/g, "")
    .trim()
    .replace(/[\s/]+/g, "-")
    .replace(/-+/g, "-")
}

function shortRand() {
  const n = Math.floor(Math.random() * 0xffffffff)
  return n.toString(16).padStart(8, "0").slice(0, 8)
}

function generateSku({ brand, name, size }: { brand: string; name: string; size: string }) {
  const base = [brand, name, size].map((s) => s.trim()).filter(Boolean).join(" ")
  const slug = slugPart(base).slice(0, 50)
  return `${slug}-${shortRand()}`
}

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
    const res = await $fetch<{ items: ProductRow[] }>("/api/products", { 
      query: { q: q.value, limit: 200 },
      headers: { Accept: 'application/json' },
    })
    items.value = res.items
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal memuat products"
    console.error('Products load error:', error)
  } finally {
    isLoading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(q, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    load()
  }, 300)
})

function resetCreateForm() {
  createForm.brand = ""
  createForm.product_type = "BAN"
  createForm.name = ""
  createForm.size = ""
  createForm.sku = ""
  createForm.sell_price = 0
  createForm.initial_qty = 0
  createForm.initial_unit_cost = 0
  createForm.is_active = true
}

async function createProduct() {
  createLoading.value = true
  createError.value = null
  try {
    const sku = createForm.sku.trim().length
      ? createForm.sku.trim()
      : generateSku({ brand: createForm.brand, name: createForm.name, size: createForm.size })
    await $fetch("/api/products", {
      method: "POST",
      body: {
        brand: createForm.brand,
        product_type: createForm.product_type,
        name: createForm.name,
        size: createForm.size,
        sku,
        sell_price: createForm.sell_price,
        initial_qty: createForm.initial_qty,
        initial_unit_cost: createForm.initial_unit_cost,
        is_active: createForm.is_active,
      },
    })
    resetCreateForm()
    showAdd.value = false
    await load()
  } catch (error) {
    createError.value = statusMessage(error) ?? "Gagal membuat produk"
  } finally {
    createLoading.value = false
  }
}

async function searchMaster() {
  masterLoading.value = true
  masterError.value = null
  attachError.value = null
  try {
    const res = await $fetch<{ items: MasterProductRow[] }>("/api/products/master", {
      query: { q: masterQ.value, limit: 20 },
    })
    masterItems.value = res.items
  } catch (error) {
    masterError.value = statusMessage(error) ?? "Gagal mencari master produk"
  } finally {
    masterLoading.value = false
    masterRan.value = true
  }
}

function selectMaster(p: MasterProductRow) {
  selectedMaster.value = p
  attachSellPrice.value = 0
  attachInitialQty.value = 0
  attachUnitCost.value = 0
  attachError.value = null
}

async function attachSelected() {
  if (!selectedMaster.value) return
  attachLoading.value = true
  try {
    await $fetch("/api/products/attach", {
      method: "POST",
      body: {
        product_id: selectedMaster.value.product_id,
        sell_price: attachSellPrice.value,
        is_active: true,
      },
    })
    if (attachInitialQty.value > 0) {
      await $fetch("/api/inventory/adjust", {
        method: "POST",
        body: {
          product_id: selectedMaster.value.product_id,
          qty_delta: attachInitialQty.value,
          unit_cost: attachUnitCost.value,
          note: "initial stock (attach)",
        },
      })
    }
    await load()
    selectedMaster.value = null
  } catch (error) {
    attachError.value = statusMessage(error) ?? "Gagal menambahkan produk ke toko"
  } finally {
    attachLoading.value = false
  }
}

function startEdit(row: ProductRow) {
  editingId.value = row.product_id
  editSellPrice.value = row.sell_price
  editError.value = null
}

function cancelEdit() {
  editingId.value = null
  editSellPrice.value = 0
  editError.value = null
}

async function saveEdit(productId: string) {
  editLoading.value = true
  editError.value = null
  try {
    await $fetch(`/api/products/${productId}`, { method: "PATCH", body: { sell_price: editSellPrice.value } })
    cancelEdit()
    await load()
  } catch (error) {
    editError.value = statusMessage(error) ?? "Gagal update sell price"
  } finally {
    editLoading.value = false
  }
}

function startEditMaster(row: ProductRow) {
  editingMasterId.value = row.product_id
  masterName.value = row.name
  masterSize.value = row.size
  masterEditError.value = null
}

function cancelEditMaster() {
  editingMasterId.value = null
  masterName.value = ""
  masterSize.value = ""
  masterEditError.value = null
}

async function saveEditMaster(productId: string) {
  masterEditLoading.value = true
  masterEditError.value = null
  try {
    await $fetch(`/api/products/master/${productId}`, {
      method: "PATCH",
      body: { name: masterName.value, size: masterSize.value },
    })
    cancelEditMaster()
    await load()
  } catch (error) {
    masterEditError.value = statusMessage(error) ?? "Gagal update master product"
  } finally {
    masterEditLoading.value = false
  }
}

async function removeFromStore(productId: string) {
  removingId.value = productId
  removeError.value = null
  try {
    await $fetch("/api/products/detach", { method: "POST", body: { product_id: productId } })
    if (editingId.value === productId) cancelEdit()
    if (stockingId.value === productId) cancelStock()
    if (editingMasterId.value === productId) cancelEditMaster()
    await load()
  } catch (error) {
    removeError.value = statusMessage(error) ?? "Gagal menghapus produk dari toko"
  } finally {
    removingId.value = null
  }
}

function startStock(row: ProductRow) {
  stockingId.value = row.product_id
  stockQtyDelta.value = 0
  stockUnitCost.value = row.avg_unit_cost ?? 0
  stockNote.value = ""
  stockError.value = null
}

function cancelStock() {
  stockingId.value = null
  stockQtyDelta.value = 0
  stockUnitCost.value = 0
  stockNote.value = ""
  stockError.value = null
}

async function submitStock(productId: string) {
  stockLoading.value = true
  stockError.value = null
  try {
    await $fetch("/api/inventory/adjust", {
      method: "POST",
      body: {
        product_id: productId,
        qty_delta: stockQtyDelta.value,
        unit_cost: stockQtyDelta.value > 0 ? stockUnitCost.value : undefined,
        note: stockNote.value.trim().length ? stockNote.value.trim() : undefined,
      },
    })
    cancelStock()
    await load()
  } catch (error) {
    stockError.value = statusMessage(error) ?? "Gagal adjust stok"
  } finally {
    stockLoading.value = false
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

async function submitBulkPriceUpdate() {
  if (bulkSelected.value.size === 0) return
  if (bulkType.value === 'price' && bulkSellPrice.value <= 0) return
  if (bulkType.value === 'stock' && bulkQtyDelta.value === 0) {
    bulkError.value = "Qty Delta tidak boleh 0"
    return
  }
  
  bulkLoading.value = true
  bulkError.value = null
  try {
    if (bulkType.value === 'price') {
      for (const productId of bulkSelected.value) {
        await $fetch(`/api/products/${productId}`, {
          method: "PATCH",
          body: { sell_price: bulkSellPrice.value }
        })
      }
    } else {
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
    }
    bulkMode.value = false
    bulkSelected.value = new Set()
    bulkSellPrice.value = 0
    bulkQtyDelta.value = 0
    bulkUnitCost.value = 0
    bulkNote.value = ''
    await load()
  } catch (error) {
    bulkError.value = statusMessage(error) ?? (bulkType.value === 'price' ? "Gagal update harga massal" : "Gagal adjust stok massal")
  } finally {
    bulkLoading.value = false
  }
}

function cancelBulk() {
  bulkMode.value = false
  bulkSelected.value = new Set()
  bulkSellPrice.value = 0
  bulkQtyDelta.value = 0
  bulkUnitCost.value = 0
  bulkNote.value = ''
  bulkError.value = null
}

onMounted(async () => {
  await load()
})
</script>

<template>
  <div class="page">
    <section class="mb-card">
      <div class="row">
        <label class="field">
          <span>Cari</span>
          <input v-model="q" class="mb-input" placeholder="SKU / brand / nama..." @keydown.enter.prevent="load" />
        </label>
        <div class="rowActions">
          <button class="mb-btn" :disabled="isLoading" @click="load">{{ isLoading ? "Loading..." : "Search" }}</button>
          <button :class="bulkMode ? 'mb-btnDanger' : 'mb-btn'" type="button" @click="bulkMode ? cancelBulk() : bulkMode = true">
            {{ bulkMode ? "Cancel Bulk" : "Bulk Update" }}
          </button>
          <button class="mb-btnPrimary" type="button" @click="showAdd = !showAdd">
            {{ showAdd ? "Tutup" : "Tambah Produk" }}
          </button>
        </div>
      </div>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </section>

    <section v-if="showAdd" class="mb-card">
      <div class="tabs" role="tablist" aria-label="Tambah produk">
        <button class="tab" :class="{ active: addTab === 'new' }" type="button" @click="addTab = 'new'">Buat</button>
        <button class="tab" :class="{ active: addTab === 'master' }" type="button" @click="addTab = 'master'">
          Dari Master
        </button>
      </div>

      <form v-if="addTab === 'new'" class="form" @submit.prevent="createProduct">
        <label class="field">
          <span>Brand</span>
          <input v-model="createForm.brand" class="mb-input" placeholder="Contoh: MAXXIS" required />
        </label>
        <label class="field">
          <span>Nama</span>
          <input v-model="createForm.name" class="mb-input" placeholder="Contoh: Victra" required />
        </label>
        <label class="field">
          <span>Size</span>
          <input v-model="createForm.size" class="mb-input" placeholder="Contoh: 110/70-12" required />
        </label>
        <label class="field">
          <span>Sell Price (Rp)</span>
          <input v-model.number="createForm.sell_price" class="mb-input" type="number" min="0" required />
        </label>
        <label class="field">
          <span>Stok Awal</span>
          <input v-model.number="createForm.initial_qty" class="mb-input" type="number" min="0" />
        </label>
        <label class="field">
          <span>Modal / Unit Cost (Rp)</span>
          <input v-model.number="createForm.initial_unit_cost" class="mb-input" type="number" min="0" />
        </label>
        <label class="field">
          <span>SKU (optional)</span>
          <input v-model="createForm.sku" class="mb-input" placeholder="Kosongkan untuk auto-generate" />
        </label>

        <div class="actions">
          <button class="mb-btnPrimary" type="submit" :disabled="createLoading">
            {{ createLoading ? "Menyimpan..." : "Simpan" }}
          </button>
          <button class="mb-btn" type="button" :disabled="createLoading" @click="resetCreateForm">Reset</button>
        </div>
        <p v-if="createError" class="error">{{ createError }}</p>
      </form>

      <div v-else class="master">
        <div class="row">
          <label class="field">
            <span>Cari master produk</span>
            <input v-model="masterQ" class="mb-input" placeholder="SKU / brand / nama..." @keydown.enter.prevent="searchMaster" />
          </label>
          <button class="mb-btn" :disabled="masterLoading" @click="searchMaster">
            {{ masterLoading ? "Loading..." : "Search" }}
          </button>
        </div>

        <p v-if="masterError" class="error">{{ masterError }}</p>
        <p v-if="attachError" class="error">{{ attachError }}</p>

        <div v-if="masterItems.length" class="masterGrid">
          <button
            v-for="p in masterItems"
            :key="p.product_id"
            type="button"
            class="masterPick"
            :class="{ active: selectedMaster?.product_id === p.product_id }"
            @click="selectMaster(p)"
          >
            <div class="mTitle">{{ p.brand }} {{ p.name }} {{ p.size }}</div>
            <div class="mSub">{{ p.sku }} • {{ p.product_type }}</div>
          </button>
        </div>
        <div v-else-if="masterRan && !masterLoading" class="empty">Tidak ada hasil.</div>

        <div v-if="selectedMaster" class="attachCard">
          <div class="attachTitle">Tambahkan ke toko</div>
          <div class="attachSub">{{ selectedMaster.brand }} {{ selectedMaster.name }} {{ selectedMaster.size }}</div>
          <div class="attachForm">
            <label class="field">
              <span>Sell Price (Rp)</span>
              <input v-model.number="attachSellPrice" class="mb-input" type="number" min="0" />
            </label>
            <label class="field">
              <span>Tambah Stok</span>
              <input v-model.number="attachInitialQty" class="mb-input" type="number" min="0" />
            </label>
            <label class="field">
              <span>Unit Cost (Rp)</span>
              <input v-model.number="attachUnitCost" class="mb-input" type="number" min="0" />
            </label>
          </div>
          <div class="actions">
            <button class="mb-btnPrimary" type="button" :disabled="attachLoading" @click="attachSelected">
              {{ attachLoading ? "Menambahkan..." : "Tambah" }}
            </button>
            <button class="mb-btn" type="button" :disabled="attachLoading" @click="selectedMaster = null">Batal</button>
          </div>
        </div>
      </div>
    </section>

    <section v-if="bulkMode" class="mb-card">
      <div class="bulkHeader">
        <div>
          <div class="bulkTitle">Bulk {{ bulkType === 'price' ? 'Update Harga' : 'Adjust Stock' }}</div>
          <div class="bulkSub">{{ bulkSelected.size }} item dipilih</div>
        </div>
        <div class="bulkTabs">
          <button class="bulkTab" :class="{ active: bulkType === 'price' }" @click="bulkType = 'price'">Harga</button>
          <button class="bulkTab" :class="{ active: bulkType === 'stock' }" @click="bulkType = 'stock'">Stock</button>
        </div>
      </div>
      
      <div v-if="bulkType === 'price'" class="bulkForm">
        <label class="field smallField">
          <span>Sell Price Baru (Rp)</span>
          <input v-model.number="bulkSellPrice" class="mb-input" type="number" min="1" step="1" />
        </label>
        <button class="mb-btnPrimary" type="button" :disabled="bulkLoading || bulkSelected.size === 0 || bulkSellPrice <= 0" @click="submitBulkPriceUpdate">
          {{ bulkLoading ? "Processing..." : `Apply to ${bulkSelected.size} items` }}
        </button>
        <span v-if="bulkError" class="errorInline">{{ bulkError }}</span>
      </div>

      <div v-else class="bulkForm">
        <label class="field smallField">
          <span>Qty Delta</span>
          <input v-model.number="bulkQtyDelta" class="mb-input" type="number" step="1" />
        </label>
        <label class="field smallField">
          <span>Unit Cost (Rp)</span>
          <input v-model.number="bulkUnitCost" class="mb-input" type="number" min="0" step="1" />
        </label>
        <label class="field bulkNoteField">
          <span>Note</span>
          <input v-model="bulkNote" class="mb-input" placeholder="Optional" />
        </label>
        <button class="mb-btnPrimary" type="button" :disabled="bulkLoading || bulkSelected.size === 0" @click="submitBulkPriceUpdate">
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
              <th style="text-align: right">Sell</th>
              <th style="text-align: right">Qty</th>
              <th v-if="!bulkMode" style="width: 1%"></th>
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
                <td style="text-align: right">Rp {{ rupiah(i.sell_price) }}</td>
                <td style="text-align: right">{{ i.qty_on_hand }}</td>
                <td v-if="!bulkMode" style="text-align: right">
                  <div class="btnGroup">
                    <button class="mb-btn" type="button" @click="startEdit(i)">Harga</button>
                    <button class="mb-btn" type="button" @click="startStock(i)">Stok</button>
                    <button class="mb-btn" type="button" @click="startEditMaster(i)">Nama</button>
                    <button class="mb-btn" type="button" :disabled="removingId === i.product_id" @click="removeFromStore(i.product_id)">
                      {{ removingId === i.product_id ? "..." : "Hapus" }}
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="editingId === i.product_id">
                <td colspan="5">
                  <div class="editRow">
                    <label class="field smallField">
                      <span>Sell Price (Rp)</span>
                      <input v-model.number="editSellPrice" class="mb-input" type="number" min="0" />
                    </label>
                    <button class="mb-btnPrimary" type="button" :disabled="editLoading" @click="saveEdit(i.product_id)">
                      {{ editLoading ? "Saving..." : "Save" }}
                    </button>
                    <button class="mb-btn" type="button" :disabled="editLoading" @click="cancelEdit">Cancel</button>
                    <span v-if="editError" class="errorInline">{{ editError }}</span>
                  </div>
                </td>
              </tr>
              <tr v-if="editingMasterId === i.product_id">
                <td colspan="5">
                  <div class="editRow">
                    <label class="field smallField">
                      <span>Nama</span>
                      <input v-model="masterName" class="mb-input" />
                    </label>
                    <label class="field smallField">
                      <span>Size</span>
                      <input v-model="masterSize" class="mb-input" />
                    </label>
                    <button
                      class="mb-btnPrimary"
                      type="button"
                      :disabled="masterEditLoading"
                      @click="saveEditMaster(i.product_id)"
                    >
                      {{ masterEditLoading ? "Saving..." : "Save" }}
                    </button>
                    <button class="mb-btn" type="button" :disabled="masterEditLoading" @click="cancelEditMaster">
                      Cancel
                    </button>
                    <span v-if="masterEditError" class="errorInline">{{ masterEditError }}</span>
                  </div>
                </td>
              </tr>
              <tr v-if="stockingId === i.product_id">
                <td colspan="5">
                  <div class="editRow">
                    <label class="field smallField">
                      <span>Qty Delta</span>
                      <input v-model.number="stockQtyDelta" class="mb-input" type="number" step="1" />
                    </label>
                    <label class="field smallField">
                      <span>Unit Cost (Rp)</span>
                      <input v-model.number="stockUnitCost" class="mb-input" type="number" min="0" step="1" />
                    </label>
                    <label class="field noteField">
                      <span>Note</span>
                      <input v-model="stockNote" class="mb-input" placeholder="Optional" />
                    </label>
                    <button class="mb-btnPrimary" type="button" :disabled="stockLoading" @click="submitStock(i.product_id)">
                      {{ stockLoading ? "Saving..." : "Save" }}
                    </button>
                    <button class="mb-btn" type="button" :disabled="stockLoading" @click="cancelStock">Cancel</button>
                    <span v-if="stockError" class="errorInline">{{ stockError }}</span>
                  </div>
                  <div class="hint">
                    Tips: Qty Delta <strong>+10</strong> untuk tambah stok. Untuk tambah stok, isi Unit Cost supaya avg cost ter-update.
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div v-else class="empty">Tidak ada data.</div>
      <p v-if="removeError" class="error">{{ removeError }}</p>
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
.rowActions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.field {
  display: grid;
  gap: 6px;
  font-size: 12px;
  flex: 1;
  min-width: 240px;
}
.tabs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.tab {
  height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
  color: var(--mb-text);
  cursor: pointer;
}
.tab.active {
  border-color: rgba(52, 199, 89, 0.9);
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.18);
}
.form {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}
.actions {
  grid-column: 1 / -1;
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.master {
  margin-top: 14px;
}
.masterGrid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}
.masterPick {
  text-align: left;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
  border-radius: 14px;
  padding: 12px 14px;
  display: grid;
  gap: 10px;
  cursor: pointer;
}
.masterPick:hover {
  border-color: rgba(52, 199, 89, 0.55);
}
.masterPick.active {
  border-color: rgba(52, 199, 89, 0.9);
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.18);
}
.mTitle {
  font-weight: 900;
}
.mSub {
  font-size: 12px;
  color: var(--mb-muted);
}
.attachCard {
  margin-top: 12px;
  border: 1px solid var(--mb-border2);
  border-radius: 14px;
  padding: 12px 14px;
  background: var(--mb-surface2);
}
.attachTitle {
  font-weight: 900;
}
.attachSub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--mb-muted);
}
.attachForm {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
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
.editRow {
  display: flex;
  gap: 10px;
  align-items: end;
  flex-wrap: wrap;
  padding: 10px 0;
}
.smallField {
  min-width: 240px;
  flex: 0 1 320px;
}
.noteField {
  min-width: 240px;
  flex: 1 1 320px;
}
.btnGroup {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.hint {
  margin-top: 6px;
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
.bulkTabs {
  display: flex;
  gap: 8px;
}
.bulkTab {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
  color: var(--mb-text);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.bulkTab:hover {
  border-color: var(--mb-success);
}
.bulkTab.active {
  background: var(--mb-success);
  border-color: var(--mb-success);
  color: white;
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
</style>
