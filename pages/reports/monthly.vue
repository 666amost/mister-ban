<script setup lang="ts">
definePageMeta({ middleware: "admin" })

type MonthlyDaily = {
  sale_date: string
  omzet: number
  profit: number
  transactions: number
}

type MonthlyTopSku = {
  sku: string
  name: string
  size: string
  brand: string
  qty: number
  revenue: number
}

type MonthlyBrandTransaction = {
  brand: string
  transactions: number
}

type MonthlyExpense = {
  item_name: string
  amount: number
  entries: number
}

type MonthlyReport = {
  month: string
  omzet: number
  profit: number
  transactions: number
  expense_total: number
  daily?: MonthlyDaily[]
  top_skus?: MonthlyTopSku[]
  brand_transactions?: MonthlyBrandTransaction[]
  expenses?: MonthlyExpense[]
}

const month = ref(new Date().toISOString().slice(0, 7))
const report = ref<MonthlyReport | null>(null)
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const isExpenseDetailOpen = ref(false)

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
    const res = await $fetch<{ report: MonthlyReport }>("/api/reports/monthly", { query: { month: month.value } })
    report.value = res.report
    isExpenseDetailOpen.value = false
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
          <span>Month</span>
          <input v-model="month" class="mb-input" type="month" />
        </label>
        <button class="mb-btn" :disabled="isLoading" @click="load">{{ isLoading ? "Loading..." : "Load" }}</button>
      </div>

      <div v-if="report" class="summary reportSummary">
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
        <div
          class="sumItem sumItemClickable"
          role="button"
          tabindex="0"
          @click="isExpenseDetailOpen = !isExpenseDetailOpen"
          @keydown.enter.prevent="isExpenseDetailOpen = !isExpenseDetailOpen"
          @keydown.space.prevent="isExpenseDetailOpen = !isExpenseDetailOpen"
        >
          <div class="labelRow">
            <div class="label">Pengeluaran</div>
            <div class="actionLink">{{ isExpenseDetailOpen ? "Tutup" : "Detail" }}</div>
          </div>
          <div class="value">Rp {{ rupiah(report.expense_total) }}</div>
        </div>
      </div>

      <div v-if="report?.brand_transactions?.length" class="tableWrap">
        <div class="sectionTitle">Transaksi per Merk</div>
        <div class="summary brandSummary">
          <div v-for="item in report.brand_transactions" :key="item.brand" class="sumItem">
            <div class="label">{{ item.brand }}</div>
            <div class="value">{{ item.transactions }} transaksi</div>
          </div>
        </div>
      </div>

      <div v-if="report && isExpenseDetailOpen" class="tableWrap">
        <div class="sectionTitle">Detail Pengeluaran</div>
        <div v-if="report?.expenses?.length">
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
        <div v-else class="emptyState">Tidak ada pengeluaran di bulan ini</div>
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
.summary.reportSummary {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
}
.sumItem {
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
  border-radius: 14px;
  padding: 14px;
}
.summary.reportSummary .sumItem {
  background: var(--mb-surface);
  border-color: var(--mb-border2);
  box-shadow:
    0 1px 0 rgba(17, 24, 39, 0.04),
    0 12px 24px rgba(17, 24, 39, 0.06);
}

.summary.reportSummary .sumItem:nth-child(-n + 2) {
  background: linear-gradient(
    180deg,
    rgba(52, 199, 89, 0.08),
    rgba(52, 199, 89, 0.02) 35%,
    var(--mb-surface) 100%
  );
}

.summary.reportSummary .label {
  font-size: 11px;
  letter-spacing: 0.2px;
}

.summary.reportSummary .value {
  margin-top: 4px;
  font-size: 15px;
}
.summary.brandSummary {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}
.labelRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.actionLink {
  font-size: 11px;
  font-weight: 800;
  color: var(--mb-primary);
  user-select: none;
}
.sumItemClickable {
  cursor: pointer;
}
.sumItemClickable:focus-visible {
  outline: 2px solid var(--mb-primary);
  outline-offset: 2px;
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
  border-bottom: 1px solid var(--mb-table-border);
}
th {
  text-align: left;
  color: var(--mb-muted);
  font-weight: 700;
}
.alignRight {
  text-align: right;
}
.emptyState {
  padding: 12px;
  border: 1px dashed var(--mb-border2);
  border-radius: 14px;
  background: var(--mb-surface2);
  color: var(--mb-muted);
  font-size: 12px;
}
.label {
  font-size: 12px;
  color: var(--mb-muted);
}
.value {
  margin-top: 6px;
  font-weight: 900;
}
.error {
  margin: 12px 0 0;
  color: var(--mb-danger);
  font-size: 12px;
}
</style>
