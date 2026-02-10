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

type MonthlyReport = {
  month: string
  omzet: number
  profit: number
  transactions: number
  expense_total: number
  daily?: MonthlyDaily[]
  top_skus?: MonthlyTopSku[]
}

const month = ref(new Date().toISOString().slice(0, 7))
const report = ref<MonthlyReport | null>(null)
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

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
        <div class="sumItem">
          <div class="label">Pengeluaran</div>
          <div class="value">Rp {{ rupiah(report.expense_total) }}</div>
        </div>
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
