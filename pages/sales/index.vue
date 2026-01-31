<script setup lang="ts">
type ProductItem = {
  product_id: string
  sku: string
  name: string
  size: string
  brand: string
  sell_price: number
  qty_on_hand: number
}

type SaleRow = {
  id: string
  sale_date: string
  payment_type: string
  customer_plate_no: string
  total: number
  created_at: string
}

const me = useMe()

const plateNo = ref("")
const paymentType = ref<"CASH" | "TRANSFER" | "QRIS" | "DEBIT" | "CREDIT" | "TEMPO">("CASH")

const search = ref("")
const searchLoading = ref(false)
const searchRan = ref(false)
const products = ref<ProductItem[]>([])
const selected = ref<Array<{ product: ProductItem; qty: number }>>([])
const dropdownOpen = ref(false)

const salesLoading = ref(false)
const sales = ref<SaleRow[]>([])

const submitLoading = ref(false)
const errorMessage = ref<string | null>(null)
const lastSaleId = ref<string | null>(null)

function rupiah(value: number) {
  return value.toLocaleString("id-ID")
}

function statusMessage(error: unknown) {
  if (!error || typeof error !== "object") return null
  const e = error as Record<string, unknown>
  return typeof e.statusMessage === "string" ? e.statusMessage : null
}

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
  // Lightweight debounce
  clearTimeout((window as unknown as { __mbSearchT?: number }).__mbSearchT)
  ;(window as unknown as { __mbSearchT?: number }).__mbSearchT = window.setTimeout(() => {
    runSearch()
  }, 250)
})

function addProduct(p: ProductItem) {
  if (p.qty_on_hand <= 0) return
  const existing = selected.value.find((x) => x.product.product_id === p.product_id)
  if (existing) {
    existing.qty += 1
    search.value = ""
    products.value = []
    dropdownOpen.value = false
    return
  }
  selected.value.push({ product: p, qty: 1 })
  search.value = ""
  products.value = []
  dropdownOpen.value = false
}

function removeProduct(productId: string) {
  selected.value = selected.value.filter((x) => x.product.product_id !== productId)
}

async function loadSales() {
  salesLoading.value = true
  errorMessage.value = null
  try {
    const res = await $fetch<{ items: SaleRow[] }>("/api/sales", { query: { limit: 50 } })
    sales.value = res.items
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal memuat sales"
  } finally {
    salesLoading.value = false
  }
}

await loadSales()

const totalPreview = computed(() => selected.value.reduce((sum, x) => sum + x.qty * x.product.sell_price, 0))

async function submit() {
  errorMessage.value = null
  lastSaleId.value = null
  if (!plateNo.value.trim()) {
    errorMessage.value = "Plat nomor wajib diisi"
    return
  }
  if (selected.value.length === 0) {
    errorMessage.value = "Pilih minimal 1 item"
    return
  }

  submitLoading.value = true
  try {
    const res = await $fetch<{ sale_id: string }>("/api/sales", {
      method: "POST",
      body: {
        plate_no: plateNo.value.trim(),
        payment_type: paymentType.value,
        items: selected.value.map((x) => ({ product_id: x.product.product_id, qty: x.qty }))
      }
    })
    lastSaleId.value = res.sale_id
    plateNo.value = ""
    selected.value = []
    await loadSales()
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal submit sales"
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
            <div class="title">Transaksi</div>
            <div class="sub">Input penjualan dan cetak struk.</div>
          </div>
          <div class="meta">
            <div class="label">Preview Total</div>
            <div class="value">Rp {{ rupiah(totalPreview) }}</div>
          </div>
        </div>

        <div class="form">
          <label class="field">
            <span>Plat Nomor</span>
            <input v-model="plateNo" class="mb-input" placeholder="B 1234 ABC" />
          </label>

          <label class="field">
            <span>Payment</span>
            <select v-model="paymentType" class="select">
              <option value="CASH">CASH</option>
              <option value="TRANSFER">TRANSFER</option>
              <option value="QRIS">QRIS</option>
              <option value="DEBIT">DEBIT</option>
              <option value="CREDIT">CREDIT</option>
              <option value="TEMPO">TEMPO</option>
            </select>
          </label>
        </div>

        <div class="search">
          <label class="field">
            <span>Cari Produk</span>
            <div class="searchBox">
            <div class="searchRow">
              <input
                v-model="search"
                class="mb-input"
                placeholder="Ketik SKU / brand / nama..."
                @keydown.enter.prevent="runSearch"
                @keydown.esc.prevent="dropdownOpen = false"
                @focus="dropdownOpen = true"
              />
              <button class="mb-btn" :disabled="searchLoading" @click="(runSearch(), (dropdownOpen = true))">
                {{ searchLoading ? "Loading..." : "Cari" }}
              </button>
            </div>
            <div v-if="dropdownOpen" class="dropdown">
              <div v-if="products.length" class="dropdownList" @mousedown.prevent>
                <button
                  v-for="p in products"
                  :key="p.product_id"
                  type="button"
                  class="dropdownItem"
                  :disabled="p.qty_on_hand <= 0"
                  @click="addProduct(p)"
                >
                  <div class="rTitle">{{ p.brand }} {{ p.name }} {{ p.size }}</div>
                  <div class="rSub">{{ p.sku }} • Rp {{ rupiah(p.sell_price) }} • Stok: {{ p.qty_on_hand }}</div>
                </button>
              </div>
              <div v-else class="dropdownEmpty">
                <div v-if="searchLoading">Mencari...</div>
                <template v-else-if="searchRan">
                  <div>Produk tidak ditemukan.</div>
                  <div v-if="me.user.value?.role === 'ADMIN'" class="emptyHint">
                    Buka halaman <NuxtLink class="link" to="/products">Products</NuxtLink> untuk tambah/attach produk.
                  </div>
                </template>
                <div v-else class="emptyHint">Ketik minimal 2 huruf untuk mulai cari.</div>
              </div>
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
                <div class="itemSub">{{ x.product.sku }} • Rp {{ rupiah(x.product.sell_price) }}</div>
              </div>
              <div class="itemActions">
                <input v-model.number="x.qty" class="qty" type="number" min="1" />
                <button class="mb-btn" @click="removeProduct(x.product.product_id)">Hapus</button>
              </div>
            </div>
          </div>
          <div v-else class="empty">Belum ada item. Cari produk lalu klik untuk tambah.</div>
        </div>

        <div class="actions">
          <div v-if="lastSaleId" class="receipt">
            Struk:
            <a :href="`/api/sales/${lastSaleId}/receipt`" target="_blank" rel="noreferrer">Buka / Print</a>
          </div>
          <button class="mb-btnPrimary" :disabled="submitLoading" @click="submit">
            {{ submitLoading ? "Memproses..." : "Simpan Transaksi" }}
          </button>
        </div>

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      </section>

      <section class="mb-card">
        <div class="row">
          <div>
            <div class="title">Sales Hari Ini</div>
            <div class="sub">Klik untuk buka struk.</div>
          </div>
          <button class="mb-btn" :disabled="salesLoading" @click="loadSales">
            {{ salesLoading ? "Loading..." : "Refresh" }}
          </button>
        </div>

        <div v-if="sales.length" class="tableWrap">
          <table class="table">
            <thead>
              <tr>
                <th>Jam</th>
                <th>Plat</th>
                <th>Payment</th>
                <th style="text-align: center">Struk</th>
                <th style="text-align: right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in sales" :key="s.id" class="trow">
                <td>
                  <a :href="`/api/sales/${s.id}/receipt`" target="_blank" rel="noreferrer">{{
                    new Date(s.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                  }}</a>
                </td>
                <td>{{ s.customer_plate_no }}</td>
                <td>{{ s.payment_type }}</td>
                <td style="text-align: center">
                  <a :href="`/api/sales/${s.id}/receipt`" target="_blank" rel="noreferrer" class="mb-btn btnLink"
                    >Print</a
                  >
                </td>
                <td style="text-align: right">Rp {{ rupiah(s.total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty">Belum ada transaksi.</div>
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
.select {
  height: 40px;
  border-radius: 12px;
  border: 1px solid var(--mb-border);
  background: var(--mb-surface);
  color: var(--mb-text);
  padding: 0 10px;
  outline: none;
}
.select:focus {
  border-color: rgba(52, 199, 89, 0.9);
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.18);
}
.search {
  margin-top: 14px;
}
.searchRow {
  display: flex;
  gap: 10px;
}
.searchBox {
  position: relative;
}
.dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface);
  border-radius: 14px;
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.08),
    0 1px 0 rgba(0, 0, 0, 0.02);
  overflow: hidden;
  z-index: 30;
}
.dropdownList {
  max-height: 280px;
  overflow: auto;
}
.dropdownItem {
  width: 100%;
  text-align: left;
  border: 0;
  border-bottom: 1px solid var(--mb-border2);
  background: var(--mb-surface);
  color: var(--mb-text);
  padding: 12px 14px;
  cursor: pointer;
}
.dropdownItem:hover {
  background: rgba(52, 199, 89, 0.06);
}
.dropdownItem:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.dropdownItem:last-child {
  border-bottom: 0;
}
.dropdownEmpty {
  padding: 12px 14px;
  color: var(--mb-muted);
  font-size: 13px;
}
.rTitle {
  font-weight: 800;
}
.rSub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--mb-muted);
}
.items {
  margin-top: 14px;
}
.itemsHead {
  font-weight: 900;
}
.itemsGrid {
  margin-top: 10px;
  display: grid;
  gap: 10px;
}
.item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  border-radius: 14px;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
  padding: 12px 14px;
}
.itemMain {
  min-width: 220px;
}
.itemTitle {
  font-weight: 800;
}
.itemSub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--mb-muted);
}
.itemActions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.qty {
  width: 90px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid var(--mb-border);
  background: var(--mb-surface);
  color: var(--mb-text);
  padding: 0 10px;
  outline: none;
}
.qty:focus {
  border-color: rgba(52, 199, 89, 0.9);
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.18);
}
.empty {
  margin-top: 10px;
  border-radius: 12px;
  border: 1px dashed var(--mb-border2);
  padding: 14px;
  font-size: 13px;
  color: var(--mb-muted);
}
.emptyHint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--mb-muted);
}
.link {
  color: rgba(29, 29, 31, 0.9);
  text-decoration: none;
}
.link:hover {
  text-decoration: underline;
}
.actions {
  margin-top: 14px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}
.receipt {
  font-size: 13px;
  color: var(--mb-muted);
}
.receipt a {
  color: rgba(29, 29, 31, 0.9);
  text-decoration: none;
}
.receipt a:hover {
  text-decoration: underline;
}
.row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  flex-wrap: wrap;
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
.trow a {
  color: rgba(29, 29, 31, 0.9);
  text-decoration: none;
}
.trow a:hover {
  text-decoration: underline;
}
.btnLink {
  height: 30px;
  padding: 0 10px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  font-size: 12px;
}
.error {
  margin: 12px 0 0;
  color: var(--mb-danger);
  font-size: 12px;
}
</style>
