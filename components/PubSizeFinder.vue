<script setup lang="ts">
import { ref, computed } from "vue"
import type { BrandCatalog, MotorFitment } from "~/types/public"
import { motorFitments, sizeHints, motorCategoryLabels } from "~/data/motorFitmentData"

const props = defineProps<{
  brandCatalog: BrandCatalog[]
}>()

const searchQuery = ref("")
const selectedFitment = ref<MotorFitment | null>(null)
const showDropdown = ref(false)

const filteredMotors = computed<MotorFitment[]>(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (q.length < 2) return []
  return motorFitments
    .filter((m) => m.name.toLowerCase().includes(q) || m.aliases.some((a) => a.includes(q)))
    .slice(0, 8)
})

function selectMotor(fitment: MotorFitment): void {
  selectedFitment.value = fitment
  searchQuery.value = fitment.name
  showDropdown.value = false
}

function handleInput(): void {
  selectedFitment.value = null
  showDropdown.value = true
}

function handleBlur(): void {
  setTimeout(() => {
    showDropdown.value = false
  }, 150)
}

function brandsWithSize(size: string): BrandCatalog[] {
  return props.brandCatalog.filter((b) => b.types.some((t) => t.sizes.includes(size)))
}

const brandsWithBoth = computed<BrandCatalog[]>(() => {
  if (!selectedFitment.value) return []
  const { front, rear } = selectedFitment.value
  const frontSet = new Set(brandsWithSize(front).map((b) => b.id))
  return brandsWithSize(rear).filter((b) => frontSet.has(b.id))
})

const brandsWithFrontOnly = computed<BrandCatalog[]>(() => {
  if (!selectedFitment.value) return []
  const { front, rear } = selectedFitment.value
  const rearIds = new Set(brandsWithSize(rear).map((b) => b.id))
  return brandsWithSize(front).filter((b) => !rearIds.has(b.id))
})
</script>

<template>
  <section id="cari-ukuran" class="pub-section pub-finder-section">
    <div class="pub-shell">
      <div class="pub-finder-layout">
        <div class="pub-finder-head">
          <div class="pub-kicker">Size Finder</div>
          <h2 class="pub-heading pub-finder-heading">Temukan ukuran ban untuk motor Anda.</h2>
          <p class="pub-finder-body">
            Ketik nama motor untuk melihat ukuran ban yang sesuai dan brand yang tersedia di Mister Ban.
          </p>

          <div class="pub-finder-input-wrap">
            <input
              v-model="searchQuery"
              type="text"
              class="pub-finder-input"
              placeholder="Contoh: Vario 125, NMAX, Beat…"
              autocomplete="off"
              @input="handleInput"
              @focus="showDropdown = true"
              @blur="handleBlur"
            />
            <div v-if="showDropdown && filteredMotors.length > 0" class="pub-finder-dropdown">
              <button
                v-for="motor in filteredMotors"
                :key="motor.id"
                type="button"
                class="pub-finder-dropdown-item"
                @mousedown.prevent="selectMotor(motor)"
              >
                <span class="pub-dropdown-name">{{ motor.name }}</span>
                <span class="pub-dropdown-cat">{{ motorCategoryLabels[motor.category] }}</span>
              </button>
            </div>
          </div>

          <Transition name="pub-finder-fade">
            <div v-if="selectedFitment" class="pub-finder-result">
              <div class="pub-result-header">
                <h3 class="pub-result-model">{{ selectedFitment.name }}</h3>
                <span class="pub-result-cat">{{ motorCategoryLabels[selectedFitment.category] }}</span>
              </div>
              <div class="pub-fitment-row">
                <div class="pub-fitment-card">
                  <span class="pub-fitment-label">Ban Depan</span>
                  <strong class="pub-fitment-size">{{ selectedFitment.front }}</strong>
                </div>
                <div class="pub-fitment-sep">·</div>
                <div class="pub-fitment-card">
                  <span class="pub-fitment-label">Ban Belakang</span>
                  <strong class="pub-fitment-size">{{ selectedFitment.rear }}</strong>
                </div>
              </div>

              <div v-if="brandsWithBoth.length > 0 || brandsWithFrontOnly.length > 0" class="pub-result-brands">
                <p class="pub-brands-label">Brand yang tersedia:</p>
                <div class="pub-brands-chips">
                  <span
                    v-for="brand in brandsWithBoth"
                    :key="brand.id"
                    class="pub-brand-chip pub-brand-chip--full"
                  >{{ brand.name }}</span>
                  <span
                    v-for="brand in brandsWithFrontOnly"
                    :key="`partial-${brand.id}`"
                    class="pub-brand-chip pub-brand-chip--partial"
                  >{{ brand.name }}</span>
                </div>
              </div>

              <div v-else class="pub-result-empty">
                Hubungi cabang untuk konfirmasi ketersediaan ukuran ini.
              </div>
            </div>
          </Transition>
        </div>

        <div class="pub-hints-panel">
          <div class="pub-hints-title">Panduan ukuran cepat</div>
          <div class="pub-hints-list">
            <div v-for="hint in sizeHints" :key="hint.label" class="pub-hint-row">
              <span class="pub-hint-label">{{ hint.label }}</span>
              <span class="pub-hint-sizes">
                <span class="pub-hint-chip">D: {{ hint.front }}</span>
                <span class="pub-hint-chip">B: {{ hint.rear }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pub-finder-section {
  border-top: 1px solid rgba(7, 54, 31, 0.1);
  background: linear-gradient(180deg, var(--pub-green-75, #edf7f0) 0%, #ffffff 100%);
}

.pub-finder-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: start;
}

@media (max-width: 800px) {
  .pub-finder-layout {
    grid-template-columns: 1fr;
    gap: 40px;
  }
}

.pub-finder-heading {
  font-size: clamp(26px, 3.5vw, 46px);
  margin-bottom: 16px;
}

.pub-finder-body {
  font-size: 15px;
  color: var(--pub-muted);
  line-height: 1.6;
  margin: 0 0 24px;
}

.pub-finder-input-wrap {
  position: relative;
  width: 100%;
  max-width: 480px;
}

.pub-finder-input {
  width: 100%;
  padding: 14px 18px;
  font-size: 15px;
  border: 1.5px solid rgba(7, 54, 31, 0.22);
  border-radius: 12px;
  background: #fff;
  color: var(--pub-green-950);
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.pub-finder-input:focus {
  border-color: var(--pub-green-600);
  box-shadow: 0 0 0 3px rgba(17, 131, 66, 0.1);
}

.pub-finder-input::placeholder {
  color: rgba(20, 32, 25, 0.38);
}

.pub-finder-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1.5px solid rgba(7, 54, 31, 0.18);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(7, 54, 31, 0.12);
  z-index: 20;
  overflow: hidden;
}

.pub-finder-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 11px 16px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
  gap: 12px;
}

.pub-finder-dropdown-item:hover {
  background: var(--pub-green-75, #edf7f0);
}

.pub-finder-dropdown-item + .pub-finder-dropdown-item {
  border-top: 1px solid rgba(7, 54, 31, 0.07);
}

.pub-dropdown-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--pub-green-950);
}

.pub-dropdown-cat {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--pub-green-700);
  background: rgba(11, 113, 58, 0.1);
  border-radius: 999px;
  padding: 2px 8px;
  white-space: nowrap;
}

.pub-finder-result {
  margin-top: 20px;
  padding: 20px;
  background: #fff;
  border: 1.5px solid rgba(7, 54, 31, 0.14);
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(7, 54, 31, 0.07);
}

.pub-result-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.pub-result-model {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: var(--pub-green-950);
}

.pub-result-cat {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pub-green-700);
  background: rgba(11, 113, 58, 0.08);
  border: 1px solid rgba(11, 113, 58, 0.18);
  border-radius: 999px;
  padding: 2px 10px;
}

.pub-fitment-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.pub-fitment-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pub-fitment-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pub-muted);
}

.pub-fitment-size {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--pub-green-950);
  font-variant-numeric: tabular-nums;
}

.pub-fitment-sep {
  font-size: 20px;
  color: rgba(20, 32, 25, 0.2);
  margin-top: 16px;
}

.pub-result-brands {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(7, 54, 31, 0.1);
}

.pub-brands-label {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pub-muted);
}

.pub-brands-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pub-brand-chip {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
}

.pub-brand-chip--full {
  background: rgba(17, 131, 66, 0.1);
  border: 1px solid rgba(17, 131, 66, 0.28);
  color: var(--pub-green-700);
}

.pub-brand-chip--partial {
  background: rgba(20, 32, 25, 0.05);
  border: 1px solid rgba(20, 32, 25, 0.14);
  color: var(--pub-muted);
}

.pub-result-empty {
  margin-top: 14px;
  font-size: 13px;
  color: var(--pub-muted);
}

.pub-hints-panel {
  padding: 24px;
  background: #fff;
  border: 1px solid rgba(7, 54, 31, 0.12);
  border-radius: 16px;
}

.pub-hints-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--pub-green-700);
  margin-bottom: 16px;
}

.pub-hints-list {
  display: grid;
  gap: 0;
}

.pub-hint-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(7, 54, 31, 0.07);
}

.pub-hint-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.pub-hint-row:first-child {
  padding-top: 0;
}

.pub-hint-label {
  font-size: 12.5px;
  color: var(--pub-green-950);
  line-height: 1.4;
  flex: 1;
}

.pub-hint-sizes {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
  flex-shrink: 0;
}

.pub-hint-chip {
  font-size: 11px;
  font-family: ui-monospace, "Cascadia Code", monospace;
  font-weight: 600;
  color: var(--pub-green-950);
  background: rgba(7, 54, 31, 0.06);
  border: 1px solid rgba(7, 54, 31, 0.12);
  border-radius: 5px;
  padding: 3px 7px;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.pub-finder-fade-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.pub-finder-fade-leave-active {
  transition: opacity 0.15s ease;
}

.pub-finder-fade-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.pub-finder-fade-leave-to {
  opacity: 0;
}
</style>
