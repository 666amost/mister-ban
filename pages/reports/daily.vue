<script setup lang="ts">
import { useRequestFetch } from '#app'
import { onBeforeUnmount, onMounted } from 'vue'

definePageMeta({ middleware: "admin" })

type DailyTopSku = {
  sku: string
  name: string
  size: string
  brand: string
  qty: number
  revenue: number
}

type DailyCustomItem = {
  item_name: string
  qty: number
  revenue: number
}

type DailyExpense = {
  item_name: string
  amount: number
  entries: number
}

type DailyStockReceiptItem = {
  item_name: string
  qty: number
  unit_label: string
}

type DailyStockReceiptDay = {
  receipt_date: string
  total_qty: number
  receipt_count: number
  items: DailyStockReceiptItem[]
}

type DailyInputType = "product" | "custom" | "expense" | "discount"

type DailyInput = {
  sale_id: string
  created_at: string
  customer_plate_no: string
  payment_method: string
  input_type: DailyInputType
  sku: string | null
  item_name: string
  qty: number
  unit_price: number
  line_total: number
}

type DailyPaymentSummary = {
  cash: number
  non_cash: number
}

type DailyQtyBreakdown = {
  ban_qty: number
  oli_qty: number
  kampas_qty: number
  custom_qty: number
}

type DailyReport = {
  date: string
  omzet: number
  profit: number
  transactions: number
  payment_summary: DailyPaymentSummary
  stock_receipt_total_qty: number
  stock_receipt_total_receipts: number
  stock_receipt_daily?: DailyStockReceiptDay[]
  qty_breakdown?: DailyQtyBreakdown
  top_skus: DailyTopSku[]
  custom_items: DailyCustomItem[]
  expenses: DailyExpense[]
  expense_total: number
  discount_total: number
  inputs: DailyInput[]
}

const date = ref(new Date().toISOString().slice(0, 10))
const report = ref<DailyReport | null>(null)
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const isStockReceiptDetailOpen = ref(false)
const requestFetch = import.meta.server ? useRequestFetch() : $fetch

function rupiah(value: number) {
  return value.toLocaleString("id-ID")
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatShortDate(value: string) {
  if (!value) return "-"
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function inputTypeLabel(value: DailyInputType) {
  if (value === "product") return "Produk"
  if (value === "custom") return "Custom"
  if (value === "discount") return "Diskon"
  return "Pengeluaran"
}

function paymentMethodLabel(value: string) {
  const raw = String(value || "")
    .toUpperCase()
    .trim()
  if (!raw) return "-"

  const labelByType: Record<string, string> = {
    CASH: "Tunai",
    TRANSFER: "Transfer",
    QRIS: "QRIS",
    DEBIT: "Debit",
    CREDIT: "Kredit",
    TEMPO: "Tempo",
    MIXED: "Campuran",
  }

  return raw
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => labelByType[part] ?? part)
    .join(" + ")
}

function paymentMethodClass(value: string) {
  const parts = String(value || "")
    .toUpperCase()
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return "unknown"
  if (parts.length === 1) return parts[0] === "CASH" ? "cash" : "nonCash"
  return "mixed"
}

function statusMessage(error: unknown) {
  if (!error || typeof error !== "object") return null
  const e = error as Record<string, unknown>
  return typeof e.statusMessage === "string" ? e.statusMessage : null
}

function formatPercent(part: number, total: number) {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return "0%"
  const value = (part / total) * 100
  return `${value.toLocaleString("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

const avgTicket = computed(() => {
  const omzet = report.value?.omzet ?? 0
  const transactions = report.value?.transactions ?? 0
  if (transactions <= 0) return 0
  return omzet / transactions
})

const profitMargin = computed(() => {
  const omzet = report.value?.omzet ?? 0
  const profit = report.value?.profit ?? 0
  return formatPercent(profit, omzet)
})

const expenseRatio = computed(() => {
  const omzet = report.value?.omzet ?? 0
  const expense = report.value?.expense_total ?? 0
  return formatPercent(expense, omzet)
})

const paymentTotal = computed(() => {
  const cash = report.value?.payment_summary.cash ?? 0
  const nonCash = report.value?.payment_summary.non_cash ?? 0
  return cash + nonCash
})

const stockReceiptDayCount = computed(() => report.value?.stock_receipt_daily?.length ?? 0)

const totalQty = computed(() => {
  const breakdown = report.value?.qty_breakdown
  if (!breakdown) return 0
  return breakdown.ban_qty + breakdown.oli_qty + breakdown.kampas_qty + breakdown.custom_qty
})

function formatStockReceiptItems(items: DailyStockReceiptItem[]) {
  if (!items.length) return "-"
  return items
    .map((item) => `${item.item_name} ${item.qty} ${item.unit_label}`)
    .join(", ")
}

function openStockReceiptDetail() {
  isStockReceiptDetailOpen.value = true
}

function closeStockReceiptDetail() {
  isStockReceiptDetailOpen.value = false
}

function handleWindowKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    closeStockReceiptDetail()
  }
}

if (import.meta.client) {
  watch(
    isStockReceiptDetailOpen,
    (open) => {
      document.body.style.overflow = open ? "hidden" : ""
    },
    { immediate: true },
  )
}

onMounted(() => {
  window.addEventListener("keydown", handleWindowKeydown)
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.body.style.overflow = ""
  }
  window.removeEventListener("keydown", handleWindowKeydown)
})

async function load() {
  isLoading.value = true
  errorMessage.value = null
  try {
    const res = await requestFetch<{ report: DailyReport }>("/api/reports/daily", { query: { date: date.value } })
    report.value = res.report
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal memuat report"
  } finally {
    isLoading.value = false
  }
}

await load()
</script>

<template>
  <div class="page">
    <section class="mb-card">
      <div class="row">
        <label class="field">
          <span>Tanggal</span>
          <input v-model="date" class="mb-input" type="date" />
        </label>
        <button class="mb-btn" :disabled="isLoading" @click="load">{{ isLoading ? "Loading..." : "Load" }}</button>
      </div>

      <div v-if="report" class="summary reportSummary">
        <div class="sumItem">
          <div class="label">Omzet</div>
          <div class="value monoNumeric">Rp {{ rupiah(report.omzet) }}</div>
          <div class="meta">Pendapatan kotor harian</div>
        </div>
        <div class="sumItem">
          <div class="label">Profit</div>
          <div class="value monoNumeric">Rp {{ rupiah(report.profit) }}</div>
          <div class="meta">Margin {{ profitMargin }}</div>
        </div>
        <div class="sumItem">
          <div class="label">Transaksi</div>
          <div class="value monoNumeric">{{ report.transactions }}</div>
          <div class="meta">Rata-rata Rp {{ rupiah(avgTicket) }} per transaksi</div>
        </div>
        <div class="sumItem">
          <div class="label">Pengeluaran</div>
          <div class="value monoNumeric">Rp {{ rupiah(report.expense_total) }}</div>
          <div class="meta">{{ expenseRatio }} dari omzet</div>
        </div>
        <div
          class="sumItem sumItemClickable"
          role="button"
          tabindex="0"
          @click="openStockReceiptDetail"
          @keydown.enter.prevent="openStockReceiptDetail"
          @keydown.space.prevent="openStockReceiptDetail"
        >
          <div class="labelRow">
            <div class="label">Barang Masuk</div>
            <span class="actionLink" aria-hidden="true">Detail</span>
          </div>
          <div class="value monoNumeric">{{ report.stock_receipt_total_qty }} qty</div>
          <div class="meta">{{ report.stock_receipt_total_receipts }} input • {{ stockReceiptDayCount }} tanggal</div>
        </div>
        <div v-if="report.discount_total > 0" class="sumItem">
          <div class="label">Total Diskon</div>
          <div class="value monoNumeric discountValue">-Rp {{ rupiah(report.discount_total) }}</div>
          <div class="meta">Potongan harga ke pembeli</div>
        </div>
      </div>

      <div v-if="report" class="tableWrap">
        <div class="sectionTitle">Metode Pembayaran</div>
        <div class="summary paymentSummary">
          <div class="sumItem">
            <div class="label">Tunai</div>
            <div class="value monoNumeric">Rp {{ rupiah(report.payment_summary.cash) }}</div>
            <div class="meta">{{ formatPercent(report.payment_summary.cash, paymentTotal) }} dari total pembayaran</div>
          </div>
          <div class="sumItem">
            <div class="label">Non Tunai</div>
            <div class="value monoNumeric">Rp {{ rupiah(report.payment_summary.non_cash) }}</div>
            <div class="meta">
              {{ formatPercent(report.payment_summary.non_cash, paymentTotal) }} dari total pembayaran
            </div>
          </div>
        </div>
      </div>

      <div v-if="report?.qty_breakdown" class="tableWrap">
        <div class="sectionTitle">Breakdown Quantity</div>
        <div class="summary paymentSummary">
          <div class="sumItem">
            <div class="label">Ban</div>
            <div class="value monoNumeric">{{ report.qty_breakdown.ban_qty }}</div>
            <div class="meta">{{ formatPercent(report.qty_breakdown.ban_qty, totalQty) }} dari total qty</div>
          </div>
          <div class="sumItem">
            <div class="label">Oli</div>
            <div class="value monoNumeric">{{ report.qty_breakdown.oli_qty }}</div>
            <div class="meta">{{ formatPercent(report.qty_breakdown.oli_qty, totalQty) }} dari total qty</div>
          </div>
          <div class="sumItem">
            <div class="label">Kampas</div>
            <div class="value monoNumeric">{{ report.qty_breakdown.kampas_qty }}</div>
            <div class="meta">{{ formatPercent(report.qty_breakdown.kampas_qty, totalQty) }} dari total qty</div>
          </div>
          <div class="sumItem">
            <div class="label">Custom</div>
            <div class="value monoNumeric">{{ report.qty_breakdown.custom_qty }}</div>
            <div class="meta">{{ formatPercent(report.qty_breakdown.custom_qty, totalQty) }} dari total qty</div>
          </div>
        </div>
      </div>

      <div v-if="report?.top_skus?.length" class="tableWrap">
        <div class="sectionTitle">Produk Reguler</div>
        <table class="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nama</th>
              <th class="alignRight">Qty</th>
              <th class="alignRight">Revenue</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in report.top_skus" :key="t.sku">
              <td class="mono">{{ t.sku }}</td>
              <td>{{ t.brand }} {{ t.name }} {{ t.size }}</td>
              <td class="alignRight">{{ t.qty }}</td>
              <td class="alignRight">Rp {{ rupiah(t.revenue) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="report?.custom_items?.length" class="tableWrap">
        <div class="sectionTitle">Produk Custom</div>
        <table class="table">
          <thead>
            <tr>
              <th>Nama</th>
              <th class="alignRight">Qty</th>
              <th class="alignRight">Revenue</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in report.custom_items" :key="item.item_name">
              <td>{{ item.item_name }}</td>
              <td class="alignRight">{{ item.qty }}</td>
              <td class="alignRight">Rp {{ rupiah(item.revenue) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="report?.expenses?.length" class="tableWrap">
        <div class="sectionTitle">Pengeluaran</div>
        <table class="table">
          <thead>
            <tr>
              <th>Item</th>
              <th class="alignRight">Jumlah Input</th>
              <th class="alignRight">Nominal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in report.expenses" :key="item.item_name">
              <td>{{ item.item_name }}</td>
              <td class="alignRight">{{ item.entries }}</td>
              <td class="alignRight">Rp {{ rupiah(item.amount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="report?.inputs?.length" class="tableWrap">
        <div class="sectionTitle">Detail Semua Input Harian</div>
        <table class="table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Plat</th>
              <th>Tipe</th>
              <th>Metode</th>
              <th>Item</th>
              <th class="alignRight">Qty</th>
              <th class="alignRight">Harga</th>
              <th class="alignRight">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in report.inputs" :key="`${item.sale_id}-${item.input_type}-${idx}`">
              <td class="mono">{{ formatTime(item.created_at) }}</td>
              <td>{{ item.customer_plate_no }}</td>
              <td>
                <span :class="`typeBadge ${item.input_type}`">{{ inputTypeLabel(item.input_type) }}</span>
              </td>
              <td>
                <span :class="`methodBadge ${paymentMethodClass(item.payment_method)}`">
                  {{ paymentMethodLabel(item.payment_method) }}
                </span>
              </td>
              <td>
                <div>{{ item.item_name }}</div>
                <div v-if="item.sku" class="itemMeta mono">{{ item.sku }}</div>
              </td>
              <td class="alignRight">{{ item.input_type === 'discount' ? '-' : item.qty }}</td>
              <td class="alignRight">
                <span v-if="item.input_type === 'discount'" class="discountAmount">-Rp {{ rupiah(item.unit_price) }}</span>
                <template v-else>Rp {{ rupiah(item.unit_price) }}</template>
              </td>
              <td class="alignRight">
                <span v-if="item.input_type === 'discount'" class="discountAmount">-Rp {{ rupiah(item.line_total) }}</span>
                <template v-else>Rp {{ rupiah(item.line_total) }}</template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Teleport to="body">
        <Transition name="expense-modal">
          <div v-if="report && isStockReceiptDetailOpen" class="modalBackdrop" @click.self="closeStockReceiptDetail">
            <div class="modalCard" role="dialog" aria-modal="true" aria-labelledby="stock-receipt-detail-title">
              <div class="modalHeader">
                <div class="modalTitleBlock">
                  <div id="stock-receipt-detail-title" class="sectionTitle sectionTitleNoMargin">Detail Barang Masuk</div>
                  <div class="modalMetaText">
                    {{ report.stock_receipt_total_receipts }} input • {{ report.stock_receipt_total_qty }} qty
                  </div>
                </div>
                <button class="mb-btn modalCloseBtn" type="button" @click="closeStockReceiptDetail">Tutup</button>
              </div>
              <div v-if="report.stock_receipt_daily?.length" class="modalBody">
                <div class="tableWrap modalTableWrap">
                  <table class="table">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th class="alignRight">Jumlah Input</th>
                        <th class="alignRight">Qty</th>
                        <th>Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="day in report.stock_receipt_daily" :key="day.receipt_date">
                        <td>{{ formatShortDate(day.receipt_date) }}</td>
                        <td class="alignRight monoNumeric">{{ day.receipt_count }}</td>
                        <td class="alignRight monoNumeric">{{ day.total_qty }}</td>
                        <td class="stockReceiptDetailCell">{{ formatStockReceiptItems(day.items) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div v-else class="emptyState">Tidak ada barang masuk di tanggal ini</div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </section>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 16px;
  min-width: 0;
  --report-panel-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 1px 2px rgba(15, 23, 42, 0.05);
  --report-item-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 1px 2px rgba(15, 23, 42, 0.06),
    0 8px 18px rgba(15, 23, 42, 0.08);
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
  min-width: 240px;
}
.summary {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}
.summary.reportSummary,
.summary.paymentSummary {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  padding: 8px;
  border-radius: 14px;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
  box-shadow: var(--report-panel-shadow);
}
.summary.paymentSummary {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}
.sumItem {
  min-width: 0;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface);
  border-radius: 12px;
  padding: 10px 12px;
  display: grid;
  gap: 4px;
  box-shadow: var(--report-item-shadow);
}
.label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--mb-muted);
}
.value {
  margin-top: 0;
  font-weight: 900;
  line-height: 1.2;
  font-size: clamp(16px, 1.6vw, 20px);
  font-variant-numeric: tabular-nums;
}
.meta {
  font-size: 10px;
  line-height: 1.3;
  color: var(--mb-muted);
}
.monoNumeric {
  font-variant-numeric: tabular-nums;
}
.labelRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.actionLink {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface);
  color: var(--mb-accent);
  font-size: 9px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.2px;
  user-select: none;
  box-shadow: inset 0 0 0 1px var(--mb-accent-outline);
}
.sumItemClickable {
  cursor: pointer;
}
.sumItemClickable:focus-visible {
  outline: 2px solid var(--mb-accent);
  outline-offset: 2px;
}
.tableWrap {
  margin-top: 14px;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}
.sectionTitle {
  margin-bottom: 8px;
  font-weight: 800;
}
.sectionTitleNoMargin {
  margin: 0;
}
.table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th,
td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--mb-table-border);
  vertical-align: top;
}
th {
  text-align: left;
  color: var(--mb-muted);
  font-weight: 700;
}
.alignRight {
  text-align: right;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
}
.itemMeta {
  color: var(--mb-muted);
}
.emptyState {
  padding: 12px;
  border: 1px dashed var(--mb-border2);
  border-radius: 14px;
  background: var(--mb-surface2);
  color: var(--mb-muted);
  font-size: 12px;
}
.typeBadge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid transparent;
}
.typeBadge.product {
  background: var(--mb-badge-product-bg);
  color: var(--mb-badge-product-fg);
  border-color: var(--mb-badge-product-border);
}
.typeBadge.custom {
  background: var(--mb-badge-custom-bg);
  color: var(--mb-badge-custom-fg);
  border-color: var(--mb-badge-custom-border);
}
.typeBadge.expense {
  background: var(--mb-badge-expense-bg);
  color: var(--mb-badge-expense-fg);
  border-color: var(--mb-badge-expense-border);
}
.typeBadge.discount {
  background: var(--mb-badge-expense-bg);
  color: var(--mb-danger);
  border-color: var(--mb-badge-expense-border);
}
.discountValue {
  color: var(--mb-danger);
}
.discountAmount {
  color: var(--mb-danger);
  font-variant-numeric: tabular-nums;
}
.methodBadge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid transparent;
  white-space: nowrap;
}
.methodBadge.cash {
  background: var(--mb-badge-product-bg);
  color: var(--mb-badge-product-fg);
  border-color: var(--mb-badge-product-border);
}
.methodBadge.nonCash {
  background: var(--mb-badge-custom-bg);
  color: var(--mb-badge-custom-fg);
  border-color: var(--mb-badge-custom-border);
}
.methodBadge.mixed {
  background: var(--mb-surface2);
  color: var(--mb-text);
  border-color: var(--mb-border2);
}
.methodBadge.unknown {
  background: var(--mb-surface2);
  color: var(--mb-muted);
  border-color: var(--mb-border2);
}
.modalBackdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  z-index: 999;
}
.modalCard {
  width: min(820px, 100%);
  max-height: 88vh;
  overflow: hidden;
  border: 1px solid var(--mb-border2);
  border-radius: 16px;
  background: var(--mb-surface);
  box-shadow:
    0 24px 60px rgba(15, 23, 42, 0.24),
    0 8px 20px rgba(15, 23, 42, 0.14);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.modalHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.modalTitleBlock {
  min-width: 0;
  flex: 1 1 auto;
  display: grid;
  gap: 4px;
}
.modalMetaText {
  color: var(--mb-muted);
  font-size: 11px;
  line-height: 1.35;
}
.modalBody {
  min-height: 0;
  flex: 1;
  display: grid;
  gap: 10px;
}
.modalTableWrap {
  margin-top: 0;
  max-height: calc(88vh - 120px);
  overflow-y: auto;
  overflow-x: auto;
}
.stockReceiptDetailCell {
  min-width: 240px;
  white-space: normal;
  color: var(--mb-muted);
  font-size: 12px;
  line-height: 1.4;
}
.modalCloseBtn {
  padding: 6px 12px;
}
.error {
  margin: 12px 0 0;
  color: var(--mb-danger);
  font-size: 12px;
}

.expense-modal-enter-active,
.expense-modal-leave-active {
  transition: opacity 180ms ease;
}

.expense-modal-enter-active .modalCard,
.expense-modal-leave-active .modalCard {
  transition:
    transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 220ms ease;
}

.expense-modal-enter-from,
.expense-modal-leave-to {
  opacity: 0;
}

.expense-modal-enter-from .modalCard,
.expense-modal-leave-to .modalCard {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

@media (max-width: 900px) {
  .field {
    min-width: 100%;
  }

  .summary.reportSummary,
  .summary.paymentSummary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .sumItem {
    padding: 12px;
  }

  .sumItemClickable .labelRow {
    flex-wrap: wrap;
    gap: 4px 8px;
    align-items: flex-start;
  }

  .sumItemClickable .labelRow .label {
    min-width: 0;
    flex: 1 1 auto;
  }

  .sumItemClickable .actionLink {
    margin-left: auto;
    min-width: 48px;
    height: 22px;
    padding: 0 8px;
  }

  .modalCard {
    max-height: 92vh;
    padding: 12px;
  }

  .modalHeader {
    align-items: flex-start;
  }

  .modalTableWrap {
    max-height: calc(92vh - 108px);
  }
}

@media (max-width: 560px) {
  .summary.reportSummary,
  .summary.paymentSummary {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .expense-modal-enter-active,
  .expense-modal-leave-active,
  .expense-modal-enter-active .modalCard,
  .expense-modal-leave-active .modalCard {
    transition: none;
  }
}
</style>
