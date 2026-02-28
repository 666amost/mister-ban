<script setup lang="ts">
import { onMounted, nextTick } from "vue";

type StoreSummary = {
  store_id: string;
  store_name: string;
  omzet: number;
  profit: number;
  qty_ban: number;
};

type MetricKey = "omzet" | "profit" | "qty_ban";
type AnimPhase = "reset" | "grow";

const props = defineProps<{ stores: StoreSummary[] }>();

const activeMetric = ref<MetricKey>("omzet");
const phase = ref<AnimPhase>("reset");

const metrics: { key: MetricKey; label: string; color: string }[] = [
  { key: "omzet", label: "Omzet", color: "rgba(52, 199, 89, 0.85)" },
  { key: "profit", label: "Profit", color: "rgba(59, 130, 246, 0.85)" },
  { key: "qty_ban", label: "QTY Ban", color: "rgba(255, 159, 64, 0.85)" },
];

function formatRupiah(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}rb`;
  return String(n);
}

function formatValue(key: MetricKey, val: number): string {
  if (key === "qty_ban") return `${val} unit`;
  return `Rp ${formatRupiah(val)}`;
}

const maxValue = computed(() => {
  if (!props.stores.length) return 1;
  return Math.max(...props.stores.map((s) => s[activeMetric.value]), 1);
});

const sortedStores = computed(() =>
  [...props.stores].sort((a, b) => b[activeMetric.value] - a[activeMetric.value]),
);

const totals = computed(() => ({
  omzet: props.stores.reduce((s, t) => s + t.omzet, 0),
  profit: props.stores.reduce((s, t) => s + t.profit, 0),
  qty_ban: props.stores.reduce((s, t) => s + t.qty_ban, 0),
}));

const DEFAULT_COLOR = "rgba(52, 199, 89, 0.85)";

const activeColor = computed(() => {
  const found = metrics.find((m) => m.key === activeMetric.value);
  return found ? found.color : DEFAULT_COLOR;
});

function barWidth(store: StoreSummary): string {
  if (phase.value === "reset") return "0%";
  return `${Math.max((store[activeMetric.value] / maxValue.value) * 100, 2)}%`;
}

function barDelay(index: number): string {
  if (phase.value === "reset") return "0ms";
  return `${80 * index}ms`;
}

function triggerAnimation() {
  phase.value = "reset";
  void nextTick(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        phase.value = "grow";
      });
    });
  });
}

watch(() => props.stores, () => triggerAnimation());
watch(activeMetric, () => triggerAnimation());

onMounted(() => triggerAnimation());
</script>

<template>
  <div class="chartWrap">
    <div class="totalsRow">
      <button
        v-for="m in metrics"
        :key="m.key"
        class="totalCard"
        :class="{ active: activeMetric === m.key }"
        @click="activeMetric = m.key"
      >
        <span class="totalLabel">{{ m.label }}</span>
        <span class="totalValue">{{ formatValue(m.key, totals[m.key]) }}</span>
      </button>
    </div>

    <div v-if="sortedStores.length" class="bars">
      <div
        v-for="(store, idx) in sortedStores"
        :key="store.store_id"
        class="barRow"
        :class="{ revealed: phase === 'grow' }"
        :style="{ transitionDelay: barDelay(idx) }"
      >
        <span class="barLabel">{{ store.store_name }}</span>
        <div class="barTrack">
          <div
            class="barFill"
            :class="{ noTransition: phase === 'reset' }"
            :style="{
              width: barWidth(store),
              backgroundColor: activeColor,
              transitionDelay: barDelay(idx),
            }"
          />
        </div>
        <span class="barValue">{{ formatValue(activeMetric, store[activeMetric]) }}</span>
      </div>
    </div>
    <div v-else class="emptyChart">Belum ada data penjualan bulan ini.</div>
  </div>
</template>

<style scoped>
.chartWrap {
  display: grid;
  gap: 16px;
}

.totalsRow {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.totalCard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  border-radius: 12px;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
  color: var(--mb-text);
  cursor: pointer;
  transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}

.totalCard:hover {
  border-color: rgba(52, 199, 89, 0.4);
  transform: translateY(-1px);
}

.totalCard.active {
  border-color: rgba(52, 199, 89, 0.8);
  box-shadow: 0 0 0 2px rgba(52, 199, 89, 0.15);
}

.totalLabel {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  opacity: 0.7;
}

.totalValue {
  font-size: 16px;
  font-weight: 800;
}

.bars {
  display: grid;
  gap: 10px;
}

.barRow {
  display: grid;
  grid-template-columns: 110px 1fr auto;
  align-items: center;
  gap: 10px;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 300ms ease, transform 300ms ease;
}

.barRow.revealed {
  opacity: 1;
  transform: translateY(0);
}

.barLabel {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.barTrack {
  height: 22px;
  border-radius: 6px;
  background: var(--mb-surface2);
  overflow: hidden;
}

.barFill {
  height: 100%;
  border-radius: 6px;
  transition: width 500ms cubic-bezier(0.22, 1, 0.36, 1);
  min-width: 0%;
}

.barFill.noTransition {
  transition: none;
}

.barValue {
  font-size: 12px;
  font-weight: 700;
  min-width: 80px;
  text-align: right;
  white-space: nowrap;
}

.emptyChart {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  opacity: 0.7;
  border-radius: 12px;
  border: 1px dashed var(--mb-border2);
}

@media (max-width: 480px) {
  .barRow {
    grid-template-columns: 80px 1fr auto;
    gap: 6px;
  }

  .barValue {
    min-width: 60px;
    font-size: 11px;
  }

  .totalValue {
    font-size: 14px;
  }
}
</style>
