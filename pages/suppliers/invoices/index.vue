<script setup lang="ts">
definePageMeta({ middleware: "admin" })

type ProductItem = {
  product_id: string
  sku: string
  name: string
  size: string
  brand: string
  sell_price: number
  qty_on_hand: number
}

type SupplierRow = {
  id: string
  name: string
  phone: string | null
}

type InvoiceRow = {
  id: string
  invoice_no: string
  invoice_date: string
  due_date: string | null
  total_amount: number
  status: string
  supplier_name: string
  paid_amount: number
  remaining: number
}

const items = ref<InvoiceRow[]>([])
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

const supplierName = ref("")
const invoiceNo = ref("")
const invoiceDate = ref(new Date().toISOString().slice(0, 10))
const dueDate = ref("")

const supplierLoading = ref(false)
const supplierRan = ref(false)
const suppliers = ref<SupplierRow[]>([])
const supplierDropdownOpen = ref(false)

const search = ref("")
const searchLoading = ref(false)
const searchRan = ref(false)
const products = ref<ProductItem[]>([])
const dropdownOpen = ref(false)

const selected = ref<
  Array<{
    product: ProductItem
    qty: number
    unit_cost: number
  }>
>([])

const submitLoading = ref(false)

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
    const res = await $fetch<{ items: InvoiceRow[] }>("/api/suppliers/invoices", { query: { limit: 100 } })
    items.value = res.items
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal memuat invoice"
  } finally {
    isLoading.value = false
  }
}

await load()

async function runSupplierSearch() {
  supplierLoading.value = true
  errorMessage.value = null
  try {
    const res = await $fetch<{ items: SupplierRow[] }>("/api/suppliers", { query: { q: supplierName.value, limit: 20 } })
    suppliers.value = res.items
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal memuat supplier"
  } finally {
    supplierLoading.value = false
    supplierRan.value = true
  }
}

watch(supplierName, (v) => {
  const term = v.trim()
  supplierDropdownOpen.value = term.length > 0
  supplierRan.value = false
  if (term.length < 2) {
    suppliers.value = []
    return
  }

  if (typeof window === "undefined") return
  clearTimeout((window as unknown as { __mbSupplierSearchT?: number }).__mbSupplierSearchT)
  ;(window as unknown as { __mbSupplierSearchT?: number }).__mbSupplierSearchT = window.setTimeout(() => {
    runSupplierSearch()
  }, 250)
})

async function runSearch() {
  searchLoading.value = true
  errorMessage.value = null
  try {
    const res = await $fetch<{ items: ProductItem[] }>("/api/products", { query: { q: search.value, limit: 20 } })
    products.value = res.items
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal mencari produk"
  } finally {
    searchLoading.value = false
    searchRan.value = true
  }
}

watch(search, (v) => {
  const term = v.trim()
  dropdownOpen.value = term.length > 0
  searchRan.value = false
  if (term.length < 2) {
    products.value = []
    return
  }

  if (typeof window === "undefined") return
  clearTimeout((window as unknown as { __mbSupplierInvSearchT?: number }).__mbSupplierInvSearchT)
  ;(window as unknown as { __mbSupplierInvSearchT?: number }).__mbSupplierInvSearchT = window.setTimeout(() => {
    runSearch()
  }, 250)
})

function addProduct(p: ProductItem) {
  const existing = selected.value.find((x) => x.product.product_id === p.product_id)
  if (existing) return
  selected.value.push({ product: p, qty: 1, unit_cost: 0 })
  search.value = ""
  products.value = []
  dropdownOpen.value = false
}

function removeProduct(productId: string) {
  selected.value = selected.value.filter((x) => x.product.product_id !== productId)
}

const totalPreview = computed(() => selected.value.reduce((sum, x) => sum + x.qty * x.unit_cost, 0))

async function submitInvoice() {
  errorMessage.value = null
  if (!supplierName.value.trim()) {
    errorMessage.value = "Supplier wajib diisi"
    return
  }
  if (!invoiceNo.value.trim()) {
    errorMessage.value = "No invoice wajib diisi"
    return
  }
  if (!invoiceDate.value) {
    errorMessage.value = "Tanggal invoice wajib diisi"
    return
  }
  if (selected.value.length === 0) {
    errorMessage.value = "Pilih minimal 1 item"
    return
  }

  submitLoading.value = true
  try {
    await $fetch("/api/suppliers/invoices", {
      method: "POST",
      body: {
        supplier_name: supplierName.value.trim(),
        invoice_no: invoiceNo.value.trim(),
        invoice_date: invoiceDate.value,
        due_date: dueDate.value ? dueDate.value : undefined,
        items: selected.value.map((x) => ({
          product_id: x.product.product_id,
          qty: Math.trunc(x.qty),
          unit_cost: Math.trunc(x.unit_cost),
        })),
      },
    })

    supplierName.value = ""
    invoiceNo.value = ""
    invoiceDate.value = new Date().toISOString().slice(0, 10)
    dueDate.value = ""
    selected.value = []
    await load()
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal membuat invoice"
  } finally {
    submitLoading.value = false
  }
}
</script>

<template>
  <div class="page">
    <section class="mb-card">
      <div class="head">
        <div>
          <div class="title">Tambah Invoice</div>
          <div class="sub">Input invoice supplier untuk menambah stok dan memonitor hutang.</div>
        </div>
        <div class="meta">
          <div class="label">Preview Total</div>
          <div class="value">Rp {{ rupiah(totalPreview) }}</div>
        </div>
      </div>

      <div class="form">
        <label class="field">
          <span>Supplier</span>
          <div>
            <input v-model="supplierName" class="mb-input" placeholder="Ketik nama supplier..." />
            <div v-if="supplierDropdownOpen" class="dropdown">
              <div v-if="supplierLoading" class="dropdownEmpty">Mencari...</div>
              <template v-else-if="suppliers.length">
                <button
                  v-for="s in suppliers"
                  :key="s.id"
                  type="button"
                  class="dropdownItem"
                  @click=";(supplierName = s.name), (supplierDropdownOpen = false)"
                >
                  <div class="rTitle">{{ s.name }}</div>
                  <div v-if="s.phone" class="rSub">{{ s.phone }}</div>
                </button>
              </template>
              <div v-else class="dropdownEmpty">
                <div v-if="supplierRan">Supplier tidak ditemukan (akan dibuat saat disimpan).</div>
                <div v-else class="emptyHint">Ketik minimal 2 huruf untuk mulai cari.</div>
              </div>
            </div>
          </div>
        </label>

        <label class="field">
          <span>No Invoice</span>
          <input v-model="invoiceNo" class="mb-input" placeholder="INV-001" />
        </label>

        <label class="field">
          <span>Tanggal Invoice</span>
          <input v-model="invoiceDate" class="mb-input" type="date" />
        </label>

        <label class="field">
          <span>Due Date (opsional)</span>
          <input v-model="dueDate" class="mb-input" type="date" />
        </label>

        <label class="field" style="grid-column: 1 / -1">
          <span>Tambah Produk</span>
          <div class="searchRow">
            <input v-model="search" class="mb-input" placeholder="Ketik SKU / brand / nama..." />
          </div>

          <div v-if="dropdownOpen" class="dropdown">
            <div v-if="searchLoading" class="dropdownEmpty">Mencari...</div>
            <template v-else-if="products.length">
              <button
                v-for="p in products"
                :key="p.product_id"
                type="button"
                class="dropdownItem"
                @click="addProduct(p)"
              >
                <div class="rTitle">{{ p.brand }} {{ p.name }} {{ p.size }}</div>
                <div class="rSub">{{ p.sku }} • Jual: Rp {{ rupiah(p.sell_price) }} • Stok: {{ p.qty_on_hand }}</div>
              </button>
            </template>
            <div v-else class="dropdownEmpty">
              <div v-if="searchRan">Produk tidak ditemukan.</div>
              <div v-else class="emptyHint">Ketik minimal 2 huruf untuk mulai cari.</div>
            </div>
          </div>
        </label>
      </div>

      <div class="items">
        <div class="itemsHead">Items</div>
        <div v-if="selected.length" class="itemsGrid">
          <div v-for="x in selected" :key="x.product.product_id" class="item">
            <div class="itemMain">
              <div class="itemTitle">{{ x.product.brand }} {{ x.product.name }} {{ x.product.size }}</div>
              <div class="itemSub">{{ x.product.sku }}</div>
            </div>
            <div class="itemActions">
              <input v-model.number="x.qty" class="qty" type="number" min="1" />
              <input v-model.number="x.unit_cost" class="qty" type="number" min="0" placeholder="HPP" />
              <button class="mb-btn" @click="removeProduct(x.product.product_id)">Hapus</button>
            </div>
          </div>
        </div>
        <div v-else class="empty">Belum ada item. Cari produk lalu klik untuk tambah.</div>
      </div>

      <div class="actions">
        <div class="hint">Simpan invoice untuk menambah stok (IN) dan membuat hutang supplier.</div>
        <button class="mb-btnPrimary" :disabled="submitLoading" @click="submitInvoice">
          {{ submitLoading ? "Memproses..." : "Simpan Invoice" }}
        </button>
      </div>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </section>

    <section class="mb-card">
      <div class="row">
        <div>
          <div class="title">List Invoice</div>
          <div class="sub">Monitoring hutang tempo dan status pembayaran.</div>
        </div>
        <button class="mb-btn" :disabled="isLoading" @click="load">{{ isLoading ? "Loading..." : "Refresh" }}</button>
      </div>

      <div v-if="items.length" class="tableWrap">
        <table class="table">
          <thead>
            <tr>
              <th>No</th>
              <th>Supplier</th>
              <th>Tanggal</th>
              <th>Due</th>
              <th>Status</th>
              <th style="text-align: right">Total</th>
              <th style="text-align: right">Sisa</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in items" :key="i.id">
              <td class="mono">{{ i.invoice_no }}</td>
              <td>{{ i.supplier_name }}</td>
              <td>{{ i.invoice_date }}</td>
              <td>{{ i.due_date ?? "-" }}</td>
              <td>{{ i.status }}</td>
              <td style="text-align: right">Rp {{ rupiah(i.total_amount) }}</td>
              <td style="text-align: right">Rp {{ rupiah(i.remaining) }}</td>
            </tr>
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
.head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-start;
}
.row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-start;
}
.title {
  font-weight: 900;
}
.sub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--mb-muted);
}
.meta {
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
  border-radius: 14px;
  padding: 12px 14px;
  min-width: 220px;
}
.label {
  font-size: 12px;
  color: var(--mb-muted);
}
.value {
  margin-top: 6px;
  font-weight: 900;
}
.form {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}
.field {
  display: grid;
  gap: 6px;
  font-size: 12px;
}
.searchRow {
  display: flex;
  gap: 10px;
  align-items: center;
}
.dropdown {
  margin-top: 8px;
  border: 1px solid var(--mb-border2);
  border-radius: 12px;
  background: var(--mb-surface);
  overflow: hidden;
}
.dropdownItem {
  width: 100%;
  text-align: left;
  background: transparent;
  border: 0;
  padding: 10px 12px;
  cursor: pointer;
}
.dropdownItem:hover {
  background: var(--mb-surface2);
}
.dropdownEmpty {
  padding: 10px 12px;
  color: var(--mb-muted);
  font-size: 12px;
}
.rTitle {
  font-weight: 800;
  font-size: 13px;
}
.rSub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--mb-muted);
}
.items {
  margin-top: 14px;
}
.itemsHead {
  font-weight: 800;
}
.itemsGrid {
  margin-top: 10px;
  display: grid;
  gap: 10px;
}
.item {
  border: 1px solid var(--mb-border2);
  border-radius: 14px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  background: var(--mb-surface2);
}
.itemTitle {
  font-weight: 900;
}
.itemSub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--mb-muted);
}
.itemActions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.qty {
  width: 96px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid var(--mb-border);
  background: var(--mb-surface);
  padding: 0 10px;
  outline: none;
}
.qty:focus {
  border-color: rgba(52, 199, 89, 0.9);
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.18);
}
.actions {
  margin-top: 14px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}
.hint {
  font-size: 12px;
  color: var(--mb-muted);
}
.emptyHint {
  margin-top: 8px;
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
</style>
