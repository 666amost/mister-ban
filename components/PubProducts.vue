<script setup lang="ts">
import { computed, ref, watch } from "vue"
import type { BrandCatalog, BrandTypeRow } from "~/types/public"

type SizeFilter = "all" | "matic" | "bebek" | "sport"

const props = defineProps<{
  brandCatalog: BrandCatalog[]
  activeBrandId: string
}>()

const emit = defineEmits<{
  switchBrand: [id: string]
}>()

const sizeFilter = ref<SizeFilter>("all")

const filterTabs: { key: SizeFilter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "matic", label: "Matic" },
  { key: "bebek", label: "Bebek" },
  { key: "sport", label: "Sport" },
]

function categorizeSize(size: string): "matic" | "bebek" | "sport" | null {
  if (/-14$/.test(size) || /-13$/.test(size) || /-12$/.test(size) || /-11$/.test(size) || /-10$/.test(size)) {
    return "matic"
  }
  if (/-17$/.test(size) || /-16$/.test(size)) {
    const width = parseFloat(size.split("/")[0] ?? "0")
    return width >= 100 ? "sport" : "bebek"
  }
  return null
}

function rowMatchesFilter(row: BrandTypeRow, filter: SizeFilter): boolean {
  if (filter === "all") return true
  return row.sizes.some((s) => categorizeSize(s) === filter)
}

function brandHasFilter(brand: BrandCatalog, filter: SizeFilter): boolean {
  if (filter === "all") return true
  return brand.types.some((row) => rowMatchesFilter(row, filter))
}

const EMPTY_BRAND: BrandCatalog = { id: "", name: "", types: [] }

const allBrands = computed(() =>
  props.brandCatalog.filter((b) => brandHasFilter(b, sizeFilter.value))
)

const activeBrand = computed<BrandCatalog>(() =>
  props.brandCatalog.find((b) => b.id === props.activeBrandId) ?? props.brandCatalog[0] ?? EMPTY_BRAND
)

const filteredTypes = computed(() =>
  sizeFilter.value === "all"
    ? activeBrand.value.types
    : activeBrand.value.types.filter((row) => rowMatchesFilter(row, sizeFilter.value))
)

watch(sizeFilter, (newFilter) => {
  if (!brandHasFilter(activeBrand.value, newFilter)) {
    const first = allBrands.value[0]
    if (first) emit("switchBrand", first.id)
  }
})
</script>

<template>
  <section id="produk" class="pub-section pub-section--dark">
    <div class="pub-shell">
      <div class="pub-products-header">
        <div class="pub-products-copy">
          <div class="pub-kicker pub-kicker--dark">Pilihan Ban</div>
          <h2 class="pub-heading pub-heading--light">Pilih brand yang sesuai dengan motor Anda.</h2>
          <p class="pub-body pub-body--light">
            Tersedia berbagai macam merk ban motor pilihan di semua cabang Mister Ban.
          </p>
        </div>
        <div class="pub-filter-tabs">
          <button
            v-for="tab in filterTabs"
            :key="tab.key"
            type="button"
            class="pub-filter-tab"
            :class="{ 'is-active': sizeFilter === tab.key }"
            @click="sizeFilter = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="pub-brand-picker">
        <button
          v-for="brand in allBrands"
          :key="brand.id"
          type="button"
          class="pub-brand-chip"
          :class="{ 'is-active': brand.id === props.activeBrandId }"
          @click="emit('switchBrand', brand.id)"
        >
          {{ brand.name }}
        </button>
      </div>

      <Transition name="pub-detail-swap" mode="out-in">
        <div :key="activeBrandId" class="pub-detail-panel">
          <div class="pub-brand-header">
            <h3 class="pub-brand-name">{{ activeBrand.name }}</h3>
            <span v-if="activeBrand.types.length > 0" class="pub-brand-count">
              {{ activeBrand.types.length }} tipe
            </span>
          </div>

          <template v-if="filteredTypes.length > 0">
            <table class="pub-size-table">
              <thead>
                <tr>
                  <th>Tipe</th>
                  <th>Ukuran Tersedia</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in filteredTypes" :key="row.type">
                  <td class="pub-type-cell">{{ row.type }}</td>
                  <td class="pub-sizes-cell">
                    <span v-for="size in row.sizes" :key="size" class="pub-size-chip">{{ size }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </template>

          <div v-else class="pub-size-empty">
            <p class="pub-empty-text">
              {{ sizeFilter === "all" ? "Stok tersedia berdasarkan permintaan." : `Tidak ada ukuran ${sizeFilter} untuk brand ini.` }}
            </p>
            <p class="pub-empty-sub">Hubungi cabang terdekat untuk informasi ukuran.</p>
          </div>
        </div>
      </Transition>
    </div>
  </section>
</template>

<style scoped>
.pub-products-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}

.pub-products-copy {
  flex: 1;
  min-width: 0;
}

.pub-filter-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex-shrink: 0;
  padding-bottom: 4px;
}

.pub-filter-tab {
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.65);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}

.pub-filter-tab:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.36);
  color: #fff;
}

.pub-filter-tab.is-active {
  background: rgba(36, 196, 102, 0.22);
  border-color: rgba(36, 196, 102, 0.6);
  color: #7de89d;
}

.pub-brand-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.pub-brand-chip {
  padding: 8px 18px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.pub-brand-chip:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.36);
  color: #fff;
  transform: translateY(-1px);
}

.pub-brand-chip.is-active {
  background: #ffffff;
  border-color: #ffffff;
  color: var(--pub-green-900);
  font-weight: 700;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.22);
  transform: translateY(-1px);
}

.pub-detail-panel {
  padding: 26px 30px;
  border-radius: 24px;
  background: #ffffff;
  color: var(--pub-green-950);
  box-shadow: 0 24px 54px rgba(0, 0, 0, 0.18);
}

.pub-detail-swap-enter-active,
.pub-detail-swap-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.24s ease;
}

.pub-detail-swap-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.pub-detail-swap-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.pub-brand-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
}

.pub-brand-name {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: var(--pub-green-950);
  letter-spacing: -0.04em;
  line-height: 1;
}

.pub-brand-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--pub-green-700);
  background: rgba(11, 101, 51, 0.08);
  border: 1px solid rgba(11, 101, 51, 0.16);
  border-radius: 999px;
  padding: 2px 10px;
}

.pub-size-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.pub-size-table thead tr {
  border-bottom: 2px solid rgba(7, 54, 31, 0.1);
}

.pub-size-table th {
  padding: 8px 10px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(20, 32, 25, 0.45);
}

.pub-size-table tbody tr {
  border-bottom: 1px solid rgba(7, 54, 31, 0.07);
}

.pub-size-table tbody tr:last-child {
  border-bottom: none;
}

.pub-type-cell {
  padding: 10px 10px;
  font-weight: 700;
  color: var(--pub-green-950);
  white-space: nowrap;
  width: 1px;
  padding-right: 16px;
}

.pub-sizes-cell {
  padding: 8px 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.pub-size-chip {
  padding: 3px 8px;
  border: 1px solid rgba(7, 54, 31, 0.14);
  border-radius: 5px;
  background: rgba(7, 54, 31, 0.05);
  color: var(--pub-green-950);
  font-size: 11.5px;
  font-family: ui-monospace, "Cascadia Code", monospace;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.pub-size-empty {
  margin-top: 12px;
  display: grid;
  gap: 4px;
}

.pub-empty-text {
  font-size: 14px;
  color: var(--pub-green-950);
}

.pub-empty-sub {
  font-size: 13px;
  color: var(--pub-muted);
}
</style>

