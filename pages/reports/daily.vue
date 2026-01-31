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

type DailyReport = {
  date: string
  omzet: number
  profit: number
  transactions: number
  top_skus: DailyTopSku[]
}

const date = ref(new Date().toISOString().slice(0, 10))
const report = ref<DailyReport | null>(null)
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
        </div>

        <div v-if="report?.top_skus?.length" class="tableWrap">
          <table class="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nama</th>
                <th style="text-align: right">Qty</th>
                <th style="text-align: right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in report.top_skus" :key="t.sku">
                <td class="mono">{{ t.sku }}</td>
                <td>{{ t.brand }} {{ t.name }} {{ t.size }}</td>
                <td style="text-align: right">{{ t.qty }}</td>
                <td style="text-align: right">Rp {{ rupiah(t.revenue) }}</td>
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
.tableWrap {
  margin-top: 14px;
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
.error {
  margin: 12px 0 0;
  color: var(--mb-danger);
  font-size: 12px;
}
</style>
