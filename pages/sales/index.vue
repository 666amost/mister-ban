<script setup lang="ts">
import { onMounted } from "vue"

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

const isInitialLoad = ref(true)
const activeTab = ref<"input" | "history">("input")
const showSuccessSheet = ref(false)

const searchInputRef = ref<HTMLInputElement | null>(null)

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
    const res = await $fetch<{ items: ProductItem[] }>("/api/products", { 
      query: { q: search.value, limit: 20 },
      headers: { Accept: 'application/json' },
    })
    products.value = res.items
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal mencari produk"
    console.error('Product search error:', error)
  } finally {
    searchLoading.value = false
    searchRan.value = true
  }
}

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

watch(search, (v) => {
  const term = v.trim()
  dropdownOpen.value = term.length > 0
  searchRan.value = false
  if (term.length < 2) {
    products.value = []
    return
  }

  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    runSearch()
  }, 300)
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

function incrementQty(productId: string) {
  const item = selected.value.find((x) => x.product.product_id === productId)
  if (item) item.qty += 1
}

function decrementQty(productId: string) {
  const item = selected.value.find((x) => x.product.product_id === productId)
  if (item && item.qty > 1) item.qty -= 1
}

async function loadSales() {
  salesLoading.value = true
  errorMessage.value = null
  try {
    const res = await $fetch<{ items: SaleRow[] }>("/api/sales", { 
      query: { limit: 50 },
      headers: { Accept: 'application/json' },
    })
    sales.value = res.items
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal memuat sales"
    console.error('Sales load error:', error)
  } finally {
    salesLoading.value = false
    isInitialLoad.value = false
  }
}

onMounted(async () => {
  await loadSales()
})

const totalPreview = computed(() => selected.value.reduce((sum, x) => sum + x.qty * x.product.sell_price, 0))
const itemCount = computed(() => selected.value.reduce((sum, x) => sum + x.qty, 0))

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
    showSuccessSheet.value = true
    plateNo.value = ""
    selected.value = []
    await loadSales()
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal submit sales"
  } finally {
    submitLoading.value = false
  }
}

function printReceipt() {
  if (lastSaleId.value) {
    window.open(`/api/sales/${lastSaleId.value}/receipt`, '_blank')
  }
}

function closeSuccessSheet() {
  showSuccessSheet.value = false
  lastSaleId.value = null
}

async function newTransaction() {
  showSuccessSheet.value = false
  lastSaleId.value = null
  await new Promise(resolve => setTimeout(resolve, 350))
  searchInputRef.value?.focus()
}
</script>

<template>
  <div class="salesPage">
    <div class="mobileTabBar">
      <button 
        class="tabBtn" 
        :class="{ active: activeTab === 'input' }" 
        @click="activeTab = 'input'"
      >
        <svg class="tabIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>Input</span>
      </button>
      <button 
        class="tabBtn" 
        :class="{ active: activeTab === 'history' }" 
        @click="activeTab = 'history'"
      >
        <svg class="tabIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Riwayat</span>
      </button>
    </div>

    <div class="tabContent" :class="{ hidden: activeTab !== 'input' }">
      <div class="searchSection">
        <div class="searchWrapper">
          <svg class="searchIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref="searchInputRef"
            v-model="search"
            class="searchInput"
            type="search"
            inputmode="search"
            placeholder="Cari SKU / brand / nama..."
            @keydown.enter.prevent="runSearch"
            @keydown.esc.prevent="dropdownOpen = false"
            @focus="dropdownOpen = true"
          />
          <button v-if="search" class="clearBtn" @click="search = ''; products = []">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="dropdownOpen && (products.length || searchLoading || searchRan)" class="searchResults">
          <div v-if="searchLoading" class="searchLoading">
            <div class="spinner" />
            <span>Mencari...</span>
          </div>
          <template v-else-if="products.length">
            <button
              v-for="p in products"
              :key="p.product_id"
              type="button"
              class="productCard"
              :disabled="p.qty_on_hand <= 0"
              @click="addProduct(p)"
            >
              <div class="productInfo">
                <div class="productName">{{ p.brand }} {{ p.name }}</div>
                <div class="productMeta">{{ p.size }} • {{ p.sku }}</div>
              </div>
              <div class="productRight">
                <div class="productPrice">Rp {{ rupiah(p.sell_price) }}</div>
                <div class="productStock" :class="{ low: p.qty_on_hand <= 5 }">
                  Stok: {{ p.qty_on_hand }}
                </div>
              </div>
              <svg class="addIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </template>
          <div v-else-if="searchRan" class="noResults">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Produk tidak ditemukan</span>
            <span v-if="me.user.value?.role === 'ADMIN'" class="noResultsHint">
              <NuxtLink to="/products">+ Tambah Produk</NuxtLink>
            </span>
          </div>
        </div>
      </div>

      <div v-if="selected.length" class="cartSection">
        <div class="cartHeader">
          <span class="cartTitle">Item Transaksi</span>
          <span class="cartBadge">{{ itemCount }} item</span>
        </div>
        <div class="cartItems">
          <div v-for="x in selected" :key="x.product.product_id" class="cartItem">
            <button class="removeBtn" @click="removeProduct(x.product.product_id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <div class="cartItemInfo">
              <div class="cartItemName">{{ x.product.brand }} {{ x.product.name }}</div>
              <div class="cartItemMeta">{{ x.product.size }} • Rp {{ rupiah(x.product.sell_price) }}</div>
            </div>
            <div class="qtyControl">
              <button class="qtyBtn" @click="decrementQty(x.product.product_id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M5 12h14" />
                </svg>
              </button>
              <span class="qtyValue">{{ x.qty }}</span>
              <button class="qtyBtn" @click="incrementQty(x.product.product_id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
            <div class="cartItemTotal">Rp {{ rupiah(x.qty * x.product.sell_price) }}</div>
          </div>
        </div>
      </div>

      <div v-else class="emptyState">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <span>Belum ada item</span>
        <span class="emptyHint">Cari produk untuk ditambahkan ke transaksi</span>
      </div>

      <div class="formSection">
        <div class="formRow">
          <label class="formField">
            <span class="formLabel">Plat Nomor</span>
            <input 
              v-model="plateNo" 
              class="formInput" 
              placeholder="B 1234 ABC"
              inputmode="text"
              autocapitalize="characters"
            />
          </label>
        </div>
        <div class="paymentGrid">
          <button
            v-for="pt in ['CASH', 'QRIS', 'TRANSFER', 'DEBIT', 'CREDIT', 'TEMPO'] as const"
            :key="pt"
            class="paymentBtn"
            :class="{ active: paymentType === pt }"
            @click="paymentType = pt"
          >
            {{ pt }}
          </button>
        </div>
      </div>

      <p v-if="errorMessage" class="errorMsg">{{ errorMessage }}</p>
    </div>

    <div class="tabContent" :class="{ hidden: activeTab !== 'history' }">
      <div class="historyHeader">
        <span class="historyTitle">Sales Hari Ini</span>
        <button class="refreshBtn" :disabled="salesLoading" @click="loadSales">
          <svg 
            class="refreshIcon" 
            :class="{ spinning: salesLoading }"
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2"
          >
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div v-if="salesLoading && isInitialLoad" class="loadingState">
        <MbSkeleton :count="5" height="72px" />
      </div>

      <div v-else-if="sales.length" class="salesList">
        <a 
          v-for="s in sales" 
          :key="s.id" 
          :href="`/api/sales/${s.id}/receipt`"
          target="_blank"
          rel="noreferrer"
          class="saleCard"
        >
          <div class="saleInfo">
            <div class="salePlate">{{ s.customer_plate_no }}</div>
            <div class="saleMeta">
              <span class="saleTime">
                {{ new Date(s.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) }}
              </span>
              <span class="salePayment">{{ s.payment_type }}</span>
            </div>
          </div>
          <div class="saleRight">
            <div class="saleTotal">Rp {{ rupiah(s.total) }}</div>
            <div class="printLabel">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </div>
          </div>
        </a>
      </div>

      <div v-else class="emptyHistory">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <span>Belum ada transaksi hari ini</span>
      </div>
    </div>

    <div v-if="activeTab === 'input'" class="bottomBar">
      <div class="totalSection">
        <span class="totalLabel">Total</span>
        <span class="totalValue">Rp {{ rupiah(totalPreview) }}</span>
      </div>
      <button 
        class="submitBtn" 
        :disabled="submitLoading || selected.length === 0 || !plateNo.trim()"
        @click="submit"
      >
        <template v-if="submitLoading">
          <div class="spinner light" />
          <span>Memproses...</span>
        </template>
        <template v-else>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M5 13l4 4L19 7" />
          </svg>
          <span>Simpan</span>
        </template>
      </button>
    </div>

    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="showSuccessSheet" class="successOverlay" @click.self="closeSuccessSheet">
          <div class="successSheet">
            <div class="successIcon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="successTitle">Transaksi Berhasil!</div>
            <div class="successSub">Struk siap dicetak</div>
            <div class="successActions">
              <button class="printBtn" @click="printReceipt">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Struk
              </button>
              <button class="newTxBtn" @click="newTransaction">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.salesPage {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 140px);
  padding-bottom: 100px;
}

.mobileTabBar {
  display: flex;
  gap: 8px;
  padding: 0 0 16px;
  position: sticky;
  top: 0;
  z-index: 10;
  background: transparent;
}

.tabBtn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 16px;
  border: 1px solid var(--mb-border2);
  border-radius: 14px;
  background: var(--mb-surface);
  color: var(--mb-muted);
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tabBtn.active {
  border-color: var(--mb-accent);
  background: rgba(52, 199, 89, 0.08);
  color: var(--mb-text);
}

.tabIcon {
  width: 20px;
  height: 20px;
}

.tabContent {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tabContent.hidden {
  display: none;
}

.searchSection {
  position: relative;
}

.searchWrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.searchIcon {
  position: absolute;
  left: 14px;
  width: 20px;
  height: 20px;
  color: var(--mb-muted);
  pointer-events: none;
}

.searchInput {
  width: 100%;
  height: 52px;
  padding: 0 44px 0 44px;
  border: 1px solid var(--mb-border);
  border-radius: 16px;
  background: var(--mb-surface);
  color: var(--mb-text);
  font-size: 16px;
  outline: none;
  -webkit-appearance: none;
}

.searchInput:focus {
  border-color: var(--mb-accent);
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.15);
}

.clearBtn {
  position: absolute;
  right: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 10px;
  background: var(--mb-surface2);
  color: var(--mb-muted);
  cursor: pointer;
}

.clearBtn svg {
  width: 18px;
  height: 18px;
}

.searchResults {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  max-height: 60vh;
  overflow-y: auto;
  border: 1px solid var(--mb-border2);
  border-radius: 16px;
  background: var(--mb-surface);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
  z-index: 50;
}

.searchLoading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  color: var(--mb-muted);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--mb-border);
  border-top-color: var(--mb-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner.light {
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: white;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.productCard {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border: none;
  border-bottom: 1px solid var(--mb-border2);
  background: var(--mb-surface);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.productCard:last-child {
  border-bottom: none;
}

.productCard:active {
  background: rgba(52, 199, 89, 0.08);
}

.productCard:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.productInfo {
  min-width: 0;
}

.productName {
  font-weight: 700;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.productMeta {
  margin-top: 4px;
  font-size: 13px;
  color: var(--mb-muted);
}

.productRight {
  text-align: right;
}

.productPrice {
  font-weight: 800;
  font-size: 15px;
}

.productStock {
  margin-top: 4px;
  font-size: 12px;
  color: var(--mb-muted);
}

.productStock.low {
  color: #ff9500;
}

.addIcon {
  width: 24px;
  height: 24px;
  color: var(--mb-accent);
}

.noResults {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 16px;
  color: var(--mb-muted);
}

.noResults svg {
  width: 48px;
  height: 48px;
  opacity: 0.5;
}

.noResultsHint a {
  color: var(--mb-accent);
  font-weight: 600;
  text-decoration: none;
}

.cartSection {
  background: var(--mb-surface);
  border: 1px solid var(--mb-border2);
  border-radius: 16px;
  overflow: hidden;
}

.cartHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
}

.cartTitle {
  font-weight: 800;
  font-size: 15px;
}

.cartBadge {
  padding: 4px 10px;
  border-radius: 20px;
  background: var(--mb-accent);
  color: white;
  font-weight: 700;
  font-size: 12px;
}

.cartItems {
  max-height: 40vh;
  overflow-y: auto;
}

.cartItem {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--mb-border2);
}

.cartItem:last-child {
  border-bottom: none;
}

.removeBtn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: rgba(215, 0, 21, 0.1);
  color: var(--mb-danger);
  cursor: pointer;
}

.removeBtn svg {
  width: 16px;
  height: 16px;
}

.cartItemInfo {
  min-width: 0;
}

.cartItemName {
  font-weight: 700;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cartItemMeta {
  margin-top: 2px;
  font-size: 12px;
  color: var(--mb-muted);
}

.qtyControl {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--mb-surface2);
  border-radius: 10px;
  padding: 4px;
}

.qtyBtn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: var(--mb-surface);
  color: var(--mb-text);
  cursor: pointer;
}

.qtyBtn:active {
  background: var(--mb-border2);
}

.qtyBtn svg {
  width: 16px;
  height: 16px;
}

.qtyValue {
  min-width: 32px;
  text-align: center;
  font-weight: 800;
  font-size: 15px;
}

.cartItemTotal {
  font-weight: 800;
  font-size: 14px;
  white-space: nowrap;
}

.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 20px;
  border: 1px dashed var(--mb-border2);
  border-radius: 14px;
  background: var(--mb-surface);
  color: var(--mb-muted);
  font-size: 14px;
}

.emptyState svg {
  width: 40px;
  height: 40px;
  opacity: 0.4;
}

.emptyHint {
  font-size: 13px;
}

.formSection {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--mb-surface);
  border: 1px solid var(--mb-border2);
  border-radius: 16px;
}

.formRow {
  display: grid;
  gap: 12px;
}

.formField {
  display: grid;
  gap: 6px;
}

.formLabel {
  font-size: 13px;
  font-weight: 600;
  color: var(--mb-muted);
}

.formInput {
  height: 48px;
  padding: 0 14px;
  border: 1px solid var(--mb-border);
  border-radius: 12px;
  background: var(--mb-surface);
  color: var(--mb-text);
  font-size: 16px;
  text-transform: uppercase;
  outline: none;
}

.formInput:focus {
  border-color: var(--mb-accent);
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.15);
}

.paymentGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.paymentBtn {
  padding: 12px 8px;
  border: 1px solid var(--mb-border);
  border-radius: 10px;
  background: var(--mb-surface);
  color: var(--mb-text);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.paymentBtn.active {
  border-color: var(--mb-accent);
  background: rgba(52, 199, 89, 0.1);
  color: var(--mb-accent);
}

.paymentBtn:active {
  transform: scale(0.97);
}

.errorMsg {
  margin: 0;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(215, 0, 21, 0.1);
  color: var(--mb-danger);
  font-size: 14px;
  font-weight: 600;
}

.historyHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.historyTitle {
  font-weight: 800;
  font-size: 18px;
}

.refreshBtn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--mb-border);
  border-radius: 12px;
  background: var(--mb-surface);
  color: var(--mb-text);
  cursor: pointer;
}

.refreshIcon {
  width: 20px;
  height: 20px;
}

.refreshIcon.spinning {
  animation: spin 1s linear infinite;
}

.loadingState {
  display: grid;
  gap: 12px;
}

.salesList {
  display: grid;
  gap: 10px;
}

.saleCard {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--mb-border2);
  border-radius: 14px;
  background: var(--mb-surface);
  text-decoration: none;
  color: inherit;
  transition: all 0.15s ease;
}

.saleCard:active {
  background: var(--mb-surface2);
  transform: scale(0.99);
}

.saleInfo {
  min-width: 0;
}

.salePlate {
  font-weight: 800;
  font-size: 16px;
}

.saleMeta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 13px;
  color: var(--mb-muted);
}

.salePayment {
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--mb-surface2);
  font-weight: 600;
  font-size: 11px;
}

.saleRight {
  text-align: right;
}

.saleTotal {
  font-weight: 800;
  font-size: 16px;
}

.printLabel {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--mb-accent);
  font-weight: 600;
}

.printLabel svg {
  width: 14px;
  height: 14px;
}

.emptyHistory {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 20px;
  color: var(--mb-muted);
}

.emptyHistory svg {
  width: 56px;
  height: 56px;
  opacity: 0.4;
}

.bottomBar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--mb-border2);
  z-index: 100;
}

.totalSection {
  flex: 1;
  min-width: 0;
}

.totalLabel {
  display: block;
  font-size: 12px;
  color: var(--mb-muted);
}

.totalValue {
  display: block;
  font-weight: 900;
  font-size: 20px;
  margin-top: 2px;
}

.submitBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 140px;
  height: 52px;
  padding: 0 24px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(180deg, var(--mb-accent), var(--mb-accent2));
  color: white;
  font-weight: 800;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.submitBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submitBtn:not(:disabled):active {
  transform: scale(0.97);
}

.submitBtn svg {
  width: 22px;
  height: 22px;
}

.successOverlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  z-index: 200;
  padding: 16px;
}

.successSheet {
  width: 100%;
  max-width: 400px;
  padding: 32px 24px;
  padding-bottom: max(32px, env(safe-area-inset-bottom));
  background: var(--mb-surface);
  border-radius: 24px 24px 0 0;
  text-align: center;
}

.successIcon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(52, 199, 89, 0.15);
  color: var(--mb-accent);
}

.successIcon svg {
  width: 32px;
  height: 32px;
}

.successTitle {
  font-weight: 900;
  font-size: 22px;
}

.successSub {
  margin-top: 8px;
  color: var(--mb-muted);
}

.successActions {
  display: grid;
  gap: 10px;
  margin-top: 24px;
}

.printBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 52px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(180deg, var(--mb-accent), var(--mb-accent2));
  color: white;
  font-weight: 800;
  font-size: 16px;
  cursor: pointer;
}

.printBtn svg {
  width: 22px;
  height: 22px;
}

.newTxBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 48px;
  border: 1px solid var(--mb-border);
  border-radius: 14px;
  background: var(--mb-surface);
  color: var(--mb-text);
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
}

.newTxBtn svg {
  width: 20px;
  height: 20px;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: all 0.3s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .successSheet,
.sheet-leave-to .successSheet {
  transform: translateY(100%);
}

@media (min-width: 768px) {
  .salesPage {
    max-width: 600px;
    margin: 0 auto;
    padding-bottom: 120px;
  }

  .bottomBar {
    left: 50%;
    transform: translateX(-50%);
    max-width: 600px;
    border-radius: 20px 20px 0 0;
  }

  .successSheet {
    border-radius: 24px;
    margin-bottom: 20px;
  }
}

@media (min-width: 1024px) {
  .salesPage {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    max-width: 1100px;
    padding-bottom: 120px;
  }

  .mobileTabBar {
    display: none;
  }

  .tabContent {
    display: flex !important;
  }

  .tabContent.hidden {
    display: flex !important;
  }

  .bottomBar {
    max-width: 1100px;
  }
}
</style>
