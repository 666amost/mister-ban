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

type MonthlyPaymentSummary = {
  cash: number
  non_cash: number
}

type MonthlyReport = {
  month: string
  omzet: number
  profit: number
  transactions: number
  payment_summary: MonthlyPaymentSummary
  expense_total: number
  oli_gardan_transactions: number
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
const requestFetch = process.server ? useRequestFetch() : $fetch

function rupiah(value: number) {
  return value.toLocaleString("id-ID")
}

function statusMessage(error: unknown) {
  if (!error || typeof error !== "object") return null
  const e = error as Record<string, unknown>
  return typeof e.statusMessage === "string" ? e.statusMessage : null
}

function openExpenseDetail() {
  isExpenseDetailOpen.value = true
}

function closeExpenseDetail() {
  isExpenseDetailOpen.value = false
}

function handleWindowKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && isExpenseDetailOpen.value) {
    closeExpenseDetail()
  }
}

if (process.client) {
  watch(
    isExpenseDetailOpen,
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
  if (process.client) {
    document.body.style.overflow = ""
  }
  window.removeEventListener("keydown", handleWindowKeydown)
})

async function load() {
  isLoading.value = true
  errorMessage.value = null
  try {
    const res = await requestFetch<{ report: MonthlyReport }>("/api/reports/monthly", { query: { month: month.value } })
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
          @click="openExpenseDetail"
          @keydown.enter.prevent="openExpenseDetail"
          @keydown.space.prevent="openExpenseDetail"
        >
          <div class="labelRow">
            <div class="label">Pengeluaran</div>
            <span class="actionLink" aria-hidden="true">Detail</span>
          </div>
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
        </div>
      </div>

      <div v-if="report?.brand_transactions?.length" class="tableWrap">
        <div class="sectionTitle">Transaksi per Merk</div>
        <div class="summary brandSummary">
          <div v-for="item in report.brand_transactions" :key="item.brand" class="sumItem">
            <div class="label">{{ item.brand }}</div>
            <div class="value">{{ item.transactions }} transaksi</div>
          </div>
          <div v-if="report.oli_gardan_transactions > 0" class="sumItem oliGardanItem">
            <div class="label">Oli Gardan</div>
            <div class="value">{{ report.oli_gardan_transactions }} transaksi</div>
          </div>
        </div>
      </div>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </section>

    <Teleport to="body">
      <Transition name="expense-modal">
        <div v-if="report && isExpenseDetailOpen" class="modalBackdrop" @click.self="closeExpenseDetail">
          <div class="modalCard" role="dialog" aria-modal="true" aria-labelledby="expense-detail-title">
            <div class="modalHeader">
              <div id="expense-detail-title" class="sectionTitle sectionTitleNoMargin">Detail Pengeluaran</div>
              <button class="mb-btn modalCloseBtn" type="button" @click="closeExpenseDetail">Tutup</button>
            </div>
            <div v-if="report?.expenses?.length" class="modalBody">
              <div class="tableWrap modalTableWrap">
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
            </div>
            <div v-else class="emptyState">Tidak ada pengeluaran di bulan ini</div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 16px;
  min-width: 0;
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
.summary.brandSummary {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}
.oliGardanItem {
  background: linear-gradient(
    180deg,
    rgba(255, 159, 10, 0.08),
    rgba(255, 159, 10, 0.02) 35%,
    var(--mb-surface2) 100%
  ) !important;
  border-color: rgba(255, 159, 10, 0.2) !important;
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
  min-width: 46px;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface);
  color: var(--mb-primary);
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.2px;
  user-select: none;
  box-shadow: 0 1px 0 rgba(17, 24, 39, 0.05);
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
.modalBody {
  min-height: 0;
  flex: 1;
}
.modalTableWrap {
  margin-top: 0;
  max-height: calc(88vh - 120px);
  overflow-y: auto;
  overflow-x: auto;
}
.modalCloseBtn {
  padding: 6px 12px;
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

  .summary.reportSummary {
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

  .modalTableWrap {
    max-height: calc(92vh - 108px);
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
