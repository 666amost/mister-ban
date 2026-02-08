<script setup lang="ts">
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

type DailyInputType = "product" | "custom" | "expense"

type DailyInput = {
  sale_id: string
  created_at: string
  customer_plate_no: string
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
  qris: number
  debit: number
  transfer: number
  credit: number
}

type DailyReport = {
  date: string
  omzet: number
  profit: number
  transactions: number
  payment_summary: DailyPaymentSummary
  top_skus: DailyTopSku[]
  custom_items: DailyCustomItem[]
  expenses: DailyExpense[]
  expense_total: number
  inputs: DailyInput[]
}

const date = ref(new Date().toISOString().slice(0, 10))
const report = ref<DailyReport | null>(null)
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const nonCashOther = computed(() => {
  const summary = report.value?.payment_summary
  if (!summary) return 0
  const knownNonCash = summary.qris + summary.debit + summary.transfer + summary.credit
  return Math.max(0, summary.non_cash - knownNonCash)
})

function rupiah(value: number) {
  return value.toLocaleString("id-ID")
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function inputTypeLabel(value: DailyInputType) {
  if (value === "product") return "Produk"
  if (value === "custom") return "Custom"
  return "Pengeluaran"
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
    const res = await $fetch<{ report: DailyReport }>("/api/reports/daily", { query: { date: date.value } })
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

      <div v-if="report" class="summary">
        <div class="sumItem">
          <div class="label">Omzet</div>
          <div class="value">Rp {{ rupiah(report.omzet) }}</div>
        </div>
        <div class="sumItem">
          <div class="label">Profit</div>
          <div class="value">Rp {{ rupiah(report.profit) }}</div>
        </div>
        <div class="sumItem">
          <div class="label">Transaksi</div>
          <div class="value">{{ report.transactions }}</div>
        </div>
        <div class="sumItem">
          <div class="label">Pengeluaran</div>
          <div class="value">Rp {{ rupiah(report.expense_total) }}</div>
        </div>
      </div>

      <div v-if="report" class="tableWrap">
        <div class="sectionTitle">Metode Pembayaran</div>
        <div class="summary paymentSummary">
          <div class="sumItem">
            <div class="label">Tunai</div>
            <div class="value">Rp {{ rupiah(report.payment_summary.cash) }}</div>
          </div>
          <div class="sumItem">
            <div class="label">Non Tunai</div>
            <div class="value">Rp {{ rupiah(report.payment_summary.non_cash) }}</div>
          </div>
          <div class="sumItem">
            <div class="label">QRIS</div>
            <div class="value">Rp {{ rupiah(report.payment_summary.qris) }}</div>
          </div>
          <div class="sumItem">
            <div class="label">Debit</div>
            <div class="value">Rp {{ rupiah(report.payment_summary.debit) }}</div>
          </div>
          <div class="sumItem">
            <div class="label">Transfer</div>
            <div class="value">Rp {{ rupiah(report.payment_summary.transfer) }}</div>
          </div>
          <div class="sumItem">
            <div class="label">Kredit</div>
            <div class="value">Rp {{ rupiah(report.payment_summary.credit) }}</div>
          </div>
          <div v-if="nonCashOther > 0" class="sumItem">
            <div class="label">Non Tunai Lainnya</div>
            <div class="value">Rp {{ rupiah(nonCashOther) }}</div>
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
                <div>{{ item.item_name }}</div>
                <div v-if="item.sku" class="itemMeta mono">{{ item.sku }}</div>
              </td>
              <td class="alignRight">{{ item.qty }}</td>
              <td class="alignRight">Rp {{ rupiah(item.unit_price) }}</td>
              <td class="alignRight">Rp {{ rupiah(item.line_total) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

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
  min-width: 240px;
}
.summary {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.sumItem {
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
  border-radius: 14px;
  padding: 14px;
}
.label {
  font-size: 12px;
  color: var(--mb-muted);
}
.value {
  margin-top: 6px;
  font-weight: 900;
}
.summary.paymentSummary {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
}

.summary.paymentSummary .sumItem {
  background: var(--mb-surface);
  border-color: var(--mb-border2);
  box-shadow:
    0 1px 0 rgba(17, 24, 39, 0.04),
    0 12px 24px rgba(17, 24, 39, 0.06);
}

.summary.paymentSummary .sumItem:nth-child(-n + 2) {
  background: linear-gradient(
    180deg,
    rgba(52, 199, 89, 0.08),
    rgba(52, 199, 89, 0.02) 35%,
    var(--mb-surface) 100%
  );
}

.summary.paymentSummary .label {
  font-size: 11px;
  letter-spacing: 0.2px;
}

.summary.paymentSummary .value {
  margin-top: 4px;
  font-size: 15px;
}
.tableWrap {
  margin-top: 14px;
  overflow: auto;
}
.sectionTitle {
  margin-bottom: 8px;
  font-weight: 800;
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
  background: rgba(26, 179, 148, 0.14);
  color: #0f5f4f;
  border-color: rgba(15, 95, 79, 0.2);
}
.typeBadge.custom {
  background: rgba(59, 130, 246, 0.12);
  color: #1f4f95;
  border-color: rgba(31, 79, 149, 0.2);
}
.typeBadge.expense {
  background: rgba(220, 38, 38, 0.12);
  color: #a51d1d;
  border-color: rgba(165, 29, 29, 0.2);
}
.error {
  margin: 12px 0 0;
  color: var(--mb-danger);
  font-size: 12px;
}
</style>
