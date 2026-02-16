<script setup lang="ts">
const me = useMe();
const storeContext = useStoreContext();

type MonthlyDaily = {
  sale_date: string;
  omzet: number;
  profit: number;
  transactions: number;
};

type MonthlyReport = {
  month: string;
  omzet: number;
  profit: number;
  transactions: number;
  daily: MonthlyDaily[];
};

type IconName =
  | "sales"
  | "inventory"
  | "products"
  | "suppliers"
  | "reports";

type MenuItem = {
  title: string;
  sub: string;
  to: string;
  icon: IconName;
};

const isAdmin = computed(() => me.user.value?.role === "ADMIN");

const monthlyReport = ref<MonthlyReport | null>(null);
const isLoadingMonthly = ref(false);
const monthlyError = ref<string | null>(null);

function rupiah(value: number) {
  return value.toLocaleString("id-ID");
}

function statusMessage(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const e = error as Record<string, unknown>;
  return typeof e.statusMessage === "string" ? e.statusMessage : null;
}

function thisMonth() {
  return new Date().toISOString().slice(0, 7);
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function lastNDays(n: number) {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(isoDate(d));
  }
  return out;
}

const trendDays = computed(() => lastNDays(14));
const trendData = computed(() => {
  const report = monthlyReport.value;
  const dates = trendDays.value;
  const map = new Map((report?.daily ?? []).map((d) => [d.sale_date, d]));
  return dates.map((date) => ({
    date,
    omzet: map.get(date)?.omzet ?? 0,
    transactions: map.get(date)?.transactions ?? 0,
  }));
});

const sparkline = computed(() => {
  const values = trendData.value.map((d) => d.omzet);
  const width = 520;
  const height = 84;
  const padX = 8;
  const padY = 10;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);

  const xFor = (i: number) =>
    padX + (values.length <= 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
  const yFor = (v: number) => padY + (1 - (v - min) / span) * innerH;

  const points = values.map((v, i) => `${xFor(i)},${yFor(v)}`).join(" ");
  const areaPoints = `${padX},${padY + innerH} ${points} ${padX + innerW},${padY + innerH}`;

  return { width, height, max, points, areaPoints, hasData: values.some((v) => v > 0) };
});

async function loadMonthly() {
  if (!isAdmin.value) return;
  if (!storeContext.store.value?.id) return;
  isLoadingMonthly.value = true;
  monthlyError.value = null;
  try {
    const res = await $fetch<{ report: MonthlyReport }>("/api/reports/monthly", { query: { month: thisMonth() } });
    monthlyReport.value = res.report;
  } catch (error) {
    monthlyError.value = statusMessage(error) ?? "Gagal memuat ringkasan";
    monthlyReport.value = null;
  } finally {
    isLoadingMonthly.value = false;
  }
}

await loadMonthly();

watch(
  () => storeContext.store.value?.id,
  async (id, prev) => {
    if (!id || id === prev) return;
    await loadMonthly();
  },
);

const menuItems = computed<MenuItem[]>(() => {
  return [
    { title: "Sales", sub: "Transaksi penjualan & struk", to: "/sales", icon: "sales" },
    { title: "Inventory", sub: "Stok per toko", to: "/inventory", icon: "inventory" },
    { title: "Products", sub: "Master produk", to: "/products", icon: "products" },
    {
      title: "Supplier Invoices",
      sub: "Invoice supplier & pembayaran",
      to: "/suppliers/invoices",
      icon: "suppliers",
    },
    { title: "Daily Report", sub: "Rekap harian", to: "/reports/daily", icon: "reports" },
    { title: "Monthly Report", sub: "Rekap bulanan", to: "/reports/monthly", icon: "reports" },
  ];
});
</script>

<template>
  <div class="dashboardPage">
    <NuxtLink v-if="!isAdmin" to="/sales" class="quickAction primary">
      <div class="qaIcon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
      <div class="qaContent">
        <div class="qaTitle">Input Transaksi</div>
        <div class="qaSub">Catat penjualan & cetak struk</div>
      </div>
      <svg class="qaArrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </NuxtLink>

    <div class="quickGrid">
      <NuxtLink v-if="isAdmin" to="/inventory" class="quickAction">
        <div class="qaIcon small">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <div class="qaContent">
          <div class="qaTitle">Cek Stok</div>
        </div>
      </NuxtLink>

      <NuxtLink v-if="isAdmin" to="/reports/daily" class="quickAction">
        <div class="qaIcon small">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div class="qaContent">
          <div class="qaTitle">Laporan</div>
        </div>
      </NuxtLink>

      <NuxtLink v-if="isAdmin" to="/products" class="quickAction">
        <div class="qaIcon small">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </div>
        <div class="qaContent">
          <div class="qaTitle">Produk</div>
        </div>
      </NuxtLink>
    </div>

    <section v-if="isAdmin" class="summaryCard">
      <div class="summaryHeader">
        <span class="summaryTitle">Ringkasan Bulan Ini</span>
        <span v-if="storeContext.store.value?.name" class="storeBadge">{{ storeContext.store.value.name }}</span>
      </div>

      <div v-if="isLoadingMonthly" class="summaryLoading">
        <MbSkeleton :count="3" height="60px" />
      </div>

      <template v-else>
        <div class="statsGrid">
          <div class="statItem">
            <div class="statValue">Rp {{ rupiah(monthlyReport?.omzet ?? 0) }}</div>
            <div class="statLabel">Omzet</div>
          </div>
          <div class="statItem">
            <div class="statValue">Rp {{ rupiah(monthlyReport?.profit ?? 0) }}</div>
            <div class="statLabel">Profit</div>
          </div>
          <div class="statItem">
            <div class="statValue">{{ monthlyReport?.transactions ?? 0 }}</div>
            <div class="statLabel">Transaksi</div>
          </div>
        </div>

        <div v-if="sparkline.hasData" class="trendSection">
          <div class="trendLabel">Trend 14 hari terakhir</div>
          <svg
            class="trendChart"
            :viewBox="`0 0 ${sparkline.width} ${sparkline.height}`"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="mbArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="rgba(52, 199, 89, 0.25)" />
                <stop offset="100%" stop-color="rgba(52, 199, 89, 0)" />
              </linearGradient>
            </defs>
            <path :d="`M ${sparkline.areaPoints} Z`" fill="url(#mbArea)" />
            <polyline
              :points="sparkline.points"
              fill="none"
              stroke="var(--mb-accent)"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>

        <p v-if="monthlyError" class="errorMsg">{{ monthlyError }}</p>
      </template>
    </section>

    <section v-if="isAdmin" class="menuSection">
      <div class="menuHeader">Menu Lainnya</div>
      <div class="menuGrid">
        <NuxtLink v-for="l in menuItems" :key="l.to" class="menuItem" :to="l.to">
          <MbIcon class="menuIcon" :name="l.icon" />
          <div class="menuContent">
            <div class="menuTitle">{{ l.title }}</div>
            <div class="menuSub">{{ l.sub }}</div>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboardPage {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.quickAction {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--mb-border2);
  border-radius: 16px;
  background: var(--mb-surface);
  color: var(--mb-text);
  text-decoration: none;
  transition: all 0.15s ease;
}

.quickAction:active {
  transform: scale(0.98);
  background: var(--mb-surface2);
}

.quickAction.primary {
  background: linear-gradient(135deg, var(--mb-accent), var(--mb-accent2));
  border-color: transparent;
  color: white;
  padding: 20px;
}

.quickAction.primary .qaIcon {
  background: rgba(255, 255, 255, 0.2);
}

.quickAction.primary .qaSub {
  color: rgba(255, 255, 255, 0.85);
}

.qaIcon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: rgba(52, 199, 89, 0.12);
  flex-shrink: 0;
}

.qaIcon.small {
  width: 40px;
  height: 40px;
  border-radius: 12px;
}

.qaIcon svg {
  width: 24px;
  height: 24px;
}

.qaIcon.small svg {
  width: 20px;
  height: 20px;
}

.qaContent {
  flex: 1;
  min-width: 0;
}

.qaTitle {
  font-weight: 800;
  font-size: 16px;
}

.qaSub {
  margin-top: 2px;
  font-size: 13px;
  color: var(--mb-muted);
}

.qaArrow {
  width: 24px;
  height: 24px;
  opacity: 0.7;
  flex-shrink: 0;
}

.quickGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 10px;
}

.quickGrid .quickAction {
  flex-direction: column;
  text-align: center;
  padding: 14px 12px;
}

.quickGrid .qaContent {
  width: 100%;
}

.quickGrid .qaTitle {
  font-size: 13px;
  font-weight: 700;
}

.summaryCard {
  padding: 16px;
  border: 1px solid var(--mb-border2);
  border-radius: 16px;
  background: var(--mb-surface);
}

.summaryHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.summaryTitle {
  font-weight: 800;
  font-size: 15px;
}

.storeBadge {
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(52, 199, 89, 0.1);
  color: var(--mb-accent);
  font-size: 12px;
  font-weight: 700;
}

.summaryLoading {
  display: grid;
  gap: 10px;
}

.statsGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.statItem {
  padding: 12px;
  border-radius: 12px;
  background: var(--mb-surface2);
  text-align: center;
}

.statValue {
  font-weight: 900;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.statLabel {
  margin-top: 4px;
  font-size: 11px;
  color: var(--mb-muted);
}

.trendSection {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--mb-border2);
}

.trendLabel {
  font-size: 12px;
  color: var(--mb-muted);
  margin-bottom: 8px;
}

.trendChart {
  width: 100%;
  height: 60px;
  display: block;
}

.errorMsg {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(215, 0, 21, 0.08);
  color: var(--mb-danger);
  font-size: 13px;
}

.menuSection {
  padding: 16px;
  border: 1px solid var(--mb-border2);
  border-radius: 16px;
  background: var(--mb-surface);
}

.menuHeader {
  font-weight: 800;
  font-size: 15px;
  margin-bottom: 12px;
}

.menuGrid {
  display: grid;
  gap: 8px;
}

.menuItem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: var(--mb-surface2);
  color: var(--mb-text);
  text-decoration: none;
  transition: all 0.15s ease;
}

.menuItem:active {
  background: var(--mb-border2);
}

.menuIcon {
  width: 20px;
  height: 20px;
  opacity: 0.75;
  flex-shrink: 0;
}

.menuContent {
  flex: 1;
  min-width: 0;
}

.menuTitle {
  font-weight: 700;
  font-size: 14px;
}

.menuSub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--mb-muted);
}

@media (min-width: 768px) {
  .dashboardPage {
    max-width: 600px;
    margin: 0 auto;
  }

  .quickGrid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
