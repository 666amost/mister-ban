<script setup lang="ts">
import { computed, ref } from "vue"
import type { BrandCatalog, BrandTypeRow } from "~/types/public"

type CategoryFilter = "all" | "matic" | "bebek" | "sport"

const props = defineProps<{
  brandCatalog: BrandCatalog[]
}>()

const activeFilter = ref<CategoryFilter>("all")
const expandedBrand = ref<string | null>(null)

const filters: Array<{ id: CategoryFilter; label: string }> = [
  { id: "all", label: "Semua" },
  { id: "matic", label: "Matic" },
  { id: "bebek", label: "Bebek" },
  { id: "sport", label: "Sport" },
]

function sizeCategory(size: string): Exclude<CategoryFilter, "all"> | null {
  const rim = Number(size.match(/-(\d+)$/)?.[1] ?? 0)
  const width = Number(size.match(/^(\d+)/)?.[1] ?? 0)
  if (rim > 0 && rim <= 14) return "matic"
  if (rim === 17) return width >= 100 ? "sport" : "bebek"
  return null
}

function matchingTypes(types: BrandTypeRow[]): BrandTypeRow[] {
  if (activeFilter.value === "all") return types
  return types.filter((type) => type.sizes.some((size) => sizeCategory(size) === activeFilter.value))
}

const brands = computed(() =>
  props.brandCatalog
    .map((brand) => ({ ...brand, filteredTypes: matchingTypes(brand.types) }))
    .filter((brand) => brand.filteredTypes.length > 0),
)

function sizeCount(types: BrandTypeRow[]): number {
  return new Set(types.flatMap((type) => type.sizes)).size
}
</script>

<template>
  <section id="merek" class="public-section public-brands-section">
    <div class="public-shell">
      <div class="public-section-heading public-section-heading--split">
        <div>
          <p class="public-kicker">Katalog ban</p>
          <h1>Pilihan merek &amp; ukuran.</h1>
          <p>Buka merek untuk melihat tipe dan ukuran.</p>
        </div>
        <div class="public-filter-pills" aria-label="Filter kategori motor">
          <button
            v-for="filter in filters"
            :key="filter.id"
            type="button"
            :class="{ 'is-active': activeFilter === filter.id }"
            :aria-pressed="activeFilter === filter.id"
            @click="activeFilter = filter.id"
          >
            {{ filter.label }}
          </button>
        </div>
      </div>

      <div class="public-brand-grid">
        <article v-for="brand in brands" :key="brand.id" class="public-brand-card">
          <button
            type="button"
            class="public-brand-card__head"
            :aria-expanded="expandedBrand === brand.id"
            :aria-controls="`brand-types-${brand.id}`"
            @click="expandedBrand = expandedBrand === brand.id ? null : brand.id"
          >
            <span class="public-brand-monogram">{{ brand.name.slice(0, 2).toUpperCase() }}</span>
            <span><strong>{{ brand.name }}</strong><small>{{ brand.filteredTypes.length }} tipe · {{ sizeCount(brand.filteredTypes) }} ukuran</small></span>
            <span aria-hidden="true">{{ expandedBrand === brand.id ? "−" : "+" }}</span>
          </button>
          <div v-show="expandedBrand === brand.id" :id="`brand-types-${brand.id}`" class="public-brand-card__body">
            <div v-for="type in brand.filteredTypes" :key="type.type">
              <strong>{{ type.type }}</strong>
              <span>{{ type.sizes.join(" · ") }}</span>
            </div>
          </div>
        </article>
      </div>

      <div class="public-inline-cta">
        <p><strong>Belum tahu ukuran ban Anda?</strong> Mulai dari nama motor saja.</p>
        <NuxtLink to="/cek-ban" class="public-button">Pilih motor</NuxtLink>
      </div>
    </div>
  </section>
</template>
