<script setup lang="ts">
import { computed, ref } from "vue"
import { motorCategoryLabels, motorFitments } from "~/data/motorFitmentData"
import type {
  MotorFitment,
  PublicBranch,
  PublicBranchRecommendation,
  PublicRecommendationResponse,
  PublicRecommendedProduct,
  PublicStockStatus,
} from "~/types/public"

const props = withDefaults(
  defineProps<{
    branches: PublicBranch[]
    preferredBranchCode?: string
  }>(),
  { preferredBranchCode: "" },
)

type UserLocation = { latitude: number; longitude: number }
type PositionFilter = "front" | "rear"

const searchQuery = ref("")
const selectedMotor = ref<MotorFitment | null>(null)
const recommendation = ref<PublicRecommendationResponse | null>(null)
const showSuggestions = ref(false)
const isLoading = ref(false)
const errorMessage = ref("")
const activePosition = ref<PositionFilter>("front")
const selectedFrontProductKey = ref("")
const selectedRearProductKey = ref("")
const selectedCity = ref("all")
const userLocation = ref<UserLocation | null>(null)
const locationMessage = ref("")
const locating = ref(false)
const showAllProducts = ref(false)
const showAllBranches = ref(false)
let requestSequence = 0

const popularMotorIds = ["beat", "vario-125", "nmax", "aerox", "scoopy"]
const popularMotors = motorFitments.filter((motor) => popularMotorIds.includes(motor.id))

const filteredMotors = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return popularMotors
  return motorFitments
    .filter(
      (motor) =>
        motor.name.toLowerCase().includes(query) ||
        motor.aliases.some((alias) => alias.toLowerCase().includes(query)),
    )
    .slice(0, 8)
})

const hasCoordinateData = computed(() =>
  props.branches.some((branch) => branch.latitude !== null && branch.longitude !== null),
)

const cities = computed(() =>
  [...new Set(props.branches.map((branch) => branch.city).filter(Boolean))].sort(),
)

const recommendationByBranch = computed(() => {
  const entries = recommendation.value?.branches ?? []
  return new Map(entries.map((entry) => [entry.branchCode, entry]))
})

const selectedFrontProduct = computed(() =>
  recommendation.value?.products.find((product) => product.key === selectedFrontProductKey.value) ?? null,
)

const selectedRearProduct = computed(() =>
  recommendation.value?.products.find((product) => product.key === selectedRearProductKey.value) ?? null,
)

const selectedProducts = computed(() =>
  [selectedFrontProduct.value, selectedRearProduct.value].filter(
    (product): product is PublicRecommendedProduct => product !== null,
  ),
)

const branchHeading = computed(() => {
  if (selectedProducts.value.length === 2) return "Cabang dengan kedua pilihan"
  if (selectedProducts.value.length === 1) return "Cabang dengan ban pilihan Anda"
  return "Cabang yang tersedia"
})

const rankedBranches = computed(() => {
  const rows = props.branches
    .filter((branch) => selectedCity.value === "all" || branch.city === selectedCity.value)
    .filter(
      (branch) =>
        selectedProducts.value.length === 0 ||
        selectedProducts.value.every((product) => productStatusAtBranch(product, branch.code) !== null),
    )
    .map((branch) => {
      const stock = recommendationByBranch.value.get(branch.code) ?? emptyBranchRecommendation(branch.code)
      const distance = calculateDistance(branch)
      const displayStatus = selectedStatusAtBranch(branch.code, stock.setStatus)
      return { branch, stock, displayStatus, distance }
    })

  return rows.sort((left, right) => {
    const leftPreferred = left.branch.code === props.preferredBranchCode ? 1 : 0
    const rightPreferred = right.branch.code === props.preferredBranchCode ? 1 : 0
    if (leftPreferred !== rightPreferred) return rightPreferred - leftPreferred
    const stockDifference = stockRank(right.displayStatus) - stockRank(left.displayStatus)
    if (stockDifference !== 0) return stockDifference
    if (left.distance !== null && right.distance !== null) return left.distance - right.distance
    if (left.distance !== null) return -1
    if (right.distance !== null) return 1
    return left.branch.name.localeCompare(right.branch.name, "id")
  })
})

const visibleBranches = computed(() =>
  showAllBranches.value ? rankedBranches.value : rankedBranches.value.slice(0, 4),
)

const productsForPosition = computed(() => {
  const products = recommendation.value?.products ?? []
  const matching = products.filter(
    (product) => product.position === activePosition.value || product.position === "both",
  )
  return showAllProducts.value ? matching : matching.slice(0, 8)
})

const productCountForPosition = computed(() =>
  (recommendation.value?.products ?? []).filter(
    (product) => product.position === activePosition.value || product.position === "both",
  ).length,
)

const fallbackContact = computed(() => {
  const branch = rankedBranches.value[0]?.branch ?? props.branches[0]
  return branch ? contactLink(branch) : "#cabang"
})

async function selectMotor(motor: MotorFitment): Promise<void> {
  const sequence = ++requestSequence
  selectedMotor.value = motor
  searchQuery.value = motor.name
  showSuggestions.value = false
  recommendation.value = null
  errorMessage.value = ""
  activePosition.value = "front"
  selectedFrontProductKey.value = ""
  selectedRearProductKey.value = ""
  showAllProducts.value = false
  showAllBranches.value = false
  isLoading.value = true

  try {
    const response = await $fetch<PublicRecommendationResponse>("/api/public/recommendations", {
      query: { motorId: motor.id },
    })
    if (sequence === requestSequence) recommendation.value = response
  } catch {
    if (sequence === requestSequence) {
      errorMessage.value = "Data stok belum dapat dimuat. Anda tetap dapat menghubungi cabang untuk konfirmasi."
    }
  } finally {
    if (sequence === requestSequence) isLoading.value = false
  }
}

function handleInput(): void {
  selectedMotor.value = null
  recommendation.value = null
  selectedFrontProductKey.value = ""
  selectedRearProductKey.value = ""
  errorMessage.value = ""
  showSuggestions.value = true
}

function closeSuggestions(): void {
  window.setTimeout(() => {
    showSuggestions.value = false
  }, 120)
}

function useMyLocation(): void {
  if (!navigator.geolocation || !hasCoordinateData.value) return
  locating.value = true
  locationMessage.value = ""
  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation.value = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }
      locationMessage.value = "Cabang diurutkan berdasarkan perkiraan jarak."
      locating.value = false
    },
    () => {
      locationMessage.value = "Lokasi tidak tersedia. Silakan pilih area secara manual."
      locating.value = false
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
  )
}

function calculateDistance(branch: PublicBranch): number | null {
  if (!userLocation.value || branch.latitude === null || branch.longitude === null) return null
  const earthRadius = 6371
  const latitudeDelta = toRadians(branch.latitude - userLocation.value.latitude)
  const longitudeDelta = toRadians(branch.longitude - userLocation.value.longitude)
  const startLatitude = toRadians(userLocation.value.latitude)
  const endLatitude = toRadians(branch.latitude)
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

function stockRank(status: PublicStockStatus): number {
  if (status === "available") return 2
  if (status === "limited") return 1
  return 0
}

function emptyBranchRecommendation(branchCode: string): PublicBranchRecommendation {
  return {
    branchCode,
    frontStatus: "contact",
    rearStatus: "contact",
    setStatus: "contact",
  }
}

function statusLabel(status: PublicStockStatus): string {
  if (status === "available") return "Tersedia"
  if (status === "limited") return "Stok terbatas"
  return "Hubungi toko"
}

function productBranchCount(product: PublicRecommendedProduct): number {
  return product.availableBranchCount
}

function productStatusAtBranch(
  product: PublicRecommendedProduct,
  branchCode: string,
): Exclude<PublicStockStatus, "contact"> | null {
  return (product.availability ?? []).find(([code]) => code === branchCode)?.[1] ?? null
}

function selectedStatusAtBranch(branchCode: string, fallback: PublicStockStatus): PublicStockStatus {
  if (selectedProducts.value.length === 0) return fallback
  const statuses = selectedProducts.value
    .map((product) => productStatusAtBranch(product, branchCode))
    .filter((status): status is Exclude<PublicStockStatus, "contact"> => status !== null)
  if (statuses.length !== selectedProducts.value.length) return "contact"
  return statuses.every((status) => status === "available") ? "available" : "limited"
}

function isProductSelected(product: PublicRecommendedProduct): boolean {
  return activePosition.value === "front"
    ? selectedFrontProductKey.value === product.key
    : selectedRearProductKey.value === product.key
}

function selectProduct(product: PublicRecommendedProduct): void {
  if (activePosition.value === "front") {
    selectedFrontProductKey.value = selectedFrontProductKey.value === product.key ? "" : product.key
  } else {
    selectedRearProductKey.value = selectedRearProductKey.value === product.key ? "" : product.key
  }
  showAllBranches.value = false
}

function clearProductSelection(position: PositionFilter): void {
  if (position === "front") selectedFrontProductKey.value = ""
  else selectedRearProductKey.value = ""
  showAllBranches.value = false
}

function instagramUrl(handle: string): string {
  return `https://instagram.com/${handle.replace(/^@/, "")}`
}

function whatsappMessage(branch: PublicBranch): string {
  const motor = selectedMotor.value
  if (!motor) return `Halo ${branch.name}, saya ingin konsultasi ban motor.`
  const lines = [
    `Halo ${branch.name}, saya cek ban melalui website Mister Ban.`,
    `Motor: ${motor.name}`,
    `Ukuran depan: ${motor.front}`,
    `Ukuran belakang: ${motor.rear}`,
  ]
  if (selectedFrontProduct.value) {
    lines.push(`Pilihan depan: ${selectedFrontProduct.value.brand} ${selectedFrontProduct.value.type}`)
  }
  if (selectedRearProduct.value) {
    lines.push(`Pilihan belakang: ${selectedRearProduct.value.brand} ${selectedRearProduct.value.type}`)
  }
  lines.push("Apakah bannya masih tersedia?")
  return lines.join("\n")
}

function contactLink(branch: PublicBranch): string {
  if (branch.whatsapp) {
    return `https://wa.me/${branch.whatsapp}?text=${encodeURIComponent(whatsappMessage(branch))}`
  }
  if (branch.instagram) return instagramUrl(branch.instagram)
  return branch.mapsUrl
}

function contactLabel(branch: PublicBranch): string {
  if (branch.whatsapp) return "Tanya via WhatsApp"
  if (branch.instagram) return "Tanya via Instagram"
  return "Lihat lokasi"
}

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value))
}
</script>

<template>
  <div id="cek-ban" class="finder-card">
    <div class="finder-card__heading">
      <span class="finder-step">1</span>
      <div>
        <p class="public-kicker">Pilih motor</p>
        <h2>Motor apa yang Anda pakai?</h2>
      </div>
    </div>

    <label class="finder-label" for="motor-search">Nama atau tipe motor</label>
    <div class="finder-search">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" /></svg>
      <input
        id="motor-search"
        v-model="searchQuery"
        type="search"
        placeholder="Contoh: Beat, NMAX, Vario"
        autocomplete="off"
        aria-autocomplete="list"
        :aria-expanded="showSuggestions"
        aria-controls="motor-suggestions"
        @input="handleInput"
        @focus="showSuggestions = true"
        @blur="closeSuggestions"
      />
      <span v-if="isLoading" class="finder-spinner" aria-label="Memuat" />

      <div v-if="showSuggestions" id="motor-suggestions" class="finder-suggestions" role="listbox">
        <button
          v-for="motor in filteredMotors"
          :key="motor.id"
          type="button"
          role="option"
          @mousedown.prevent="selectMotor(motor)"
        >
          <span><strong>{{ motor.name }}</strong><small>{{ motorCategoryLabels[motor.category] }}</small></span>
          <span aria-hidden="true">Pilih</span>
        </button>
        <div v-if="searchQuery.trim().length >= 2 && filteredMotors.length === 0" class="finder-not-found">
          <strong>Motor belum ada di daftar.</strong>
          <span>Tim cabang dapat membantu mengecek ukuran secara langsung.</span>
          <a :href="fallbackContact" target="_blank" rel="noreferrer">Konsultasi dengan cabang</a>
        </div>
      </div>
    </div>

    <div v-if="!selectedMotor" class="finder-popular">
      <span>Sering dicari:</span>
      <button v-for="motor in popularMotors" :key="motor.id" type="button" @click="selectMotor(motor)">
        {{ motor.name.replace(/^(Honda|Yamaha)\s/, "") }}
      </button>
    </div>

    <p v-if="errorMessage" class="finder-alert" role="alert">{{ errorMessage }}</p>

    <div v-if="selectedMotor" class="finder-result" aria-live="polite">
      <div class="finder-result__title">
        <div><small>Hasil untuk</small><h3>{{ selectedMotor.name }}</h3></div>
        <span>{{ motorCategoryLabels[selectedMotor.category] }}</span>
      </div>

      <div class="finder-sizes">
        <article><span>Ban depan</span><strong>{{ selectedMotor.front }}</strong></article>
        <article><span>Ban belakang</span><strong>{{ selectedMotor.rear }}</strong></article>
      </div>
      <p class="finder-note">Ukuran dapat berbeda menurut tahun atau varian. Cocokkan kembali dengan tulisan pada ban atau buku kendaraan.</p>

      <template v-if="recommendation">
        <div class="finder-divider" />
        <div class="finder-subheading">
          <div>
            <span class="finder-step">2</span>
            <div><p class="public-kicker">Pilih ban</p><h3>Klik ban yang Anda inginkan</h3></div>
          </div>
          <small>Diperbarui {{ formatUpdatedAt(recommendation.updatedAt) }}</small>
        </div>

        <div class="finder-tabs" role="tablist" aria-label="Posisi ban">
          <button type="button" :class="{ 'is-active': activePosition === 'front' }" @click="activePosition = 'front'; showAllProducts = false">
            Depan · {{ selectedMotor.front }}{{ selectedFrontProductKey ? " · ✓" : "" }}
          </button>
          <button type="button" :class="{ 'is-active': activePosition === 'rear' }" @click="activePosition = 'rear'; showAllProducts = false">
            Belakang · {{ selectedMotor.rear }}{{ selectedRearProductKey ? " · ✓" : "" }}
          </button>
        </div>

        <div v-if="productsForPosition.length" class="finder-products">
          <button
            v-for="product in productsForPosition"
            :key="product.key"
            type="button"
            class="finder-product"
            :class="{ 'is-selected': isProductSelected(product) }"
            :aria-pressed="isProductSelected(product)"
            @click="selectProduct(product)"
          >
            <div><span>{{ product.brand }}</span><strong>{{ product.type }}</strong></div>
            <div class="finder-product__meta">
              <b>{{ product.size }}</b>
              <small>{{ isProductSelected(product) ? "Dipilih" : `Ada di ${productBranchCount(product)} cabang` }}</small>
            </div>
          </button>
        </div>
        <p v-else class="finder-empty">Belum ada stok untuk ukuran ini. Hubungi cabang untuk pilihan lain.</p>
        <button v-if="productCountForPosition > 8" type="button" class="finder-more" @click="showAllProducts = !showAllProducts">
          {{ showAllProducts ? "Tampilkan lebih sedikit" : `Lihat semua ${productCountForPosition} pilihan` }}
        </button>

        <div class="finder-divider" />
        <div class="finder-subheading finder-subheading--branches">
          <div>
            <span class="finder-step">3</span>
            <div><p class="public-kicker">Pilih toko</p><h3>{{ branchHeading }}</h3></div>
          </div>
          <button v-if="hasCoordinateData" type="button" class="finder-location" :disabled="locating" @click="useMyLocation">
            {{ locating ? "Mencari lokasi…" : "Gunakan lokasi saya" }}
          </button>
        </div>

        <div v-if="selectedProducts.length" class="finder-selected-products" aria-label="Ban yang dipilih">
          <button v-if="selectedFrontProduct" type="button" @click="clearProductSelection('front')">
            Depan: {{ selectedFrontProduct.brand }} {{ selectedFrontProduct.type }} <span aria-hidden="true">×</span>
          </button>
          <button v-if="selectedRearProduct" type="button" @click="clearProductSelection('rear')">
            Belakang: {{ selectedRearProduct.brand }} {{ selectedRearProduct.type }} <span aria-hidden="true">×</span>
          </button>
        </div>

        <div class="finder-area-filter">
          <label for="branch-city">Area</label>
          <select id="branch-city" v-model="selectedCity">
            <option value="all">Semua area</option>
            <option v-for="city in cities" :key="city" :value="city">{{ city }}</option>
          </select>
          <span v-if="locationMessage">{{ locationMessage }}</span>
        </div>

        <div class="finder-branches">
          <article v-for="item in visibleBranches" :key="item.branch.code" class="finder-branch">
            <div class="finder-branch__top">
              <div><strong>{{ item.branch.name }}</strong><span>{{ item.branch.city }}</span></div>
              <span class="stock-badge" :class="`is-${item.displayStatus}`">{{ statusLabel(item.displayStatus) }}</span>
            </div>
            <p>{{ item.branch.address }}</p>
            <small v-if="item.distance !== null">Sekitar {{ item.distance.toFixed(1) }} km dari Anda</small>
            <div class="finder-branch__actions">
              <a :href="item.branch.mapsUrl" target="_blank" rel="noreferrer">Petunjuk arah</a>
              <a :href="contactLink(item.branch)" target="_blank" rel="noreferrer" class="is-primary">{{ contactLabel(item.branch) }}</a>
            </div>
          </article>
        </div>
        <div v-if="rankedBranches.length === 0" class="finder-empty finder-empty--branches">
          <strong>Tidak ada cabang untuk pilihan ini.</strong>
          <span>Hapus salah satu pilihan ban atau pilih area lain.</span>
        </div>
        <button v-if="rankedBranches.length > 4" type="button" class="finder-more" @click="showAllBranches = !showAllBranches">
          {{ showAllBranches ? "Tampilkan lebih sedikit" : `Lihat semua ${rankedBranches.length} cabang` }}
        </button>
      </template>
    </div>
  </div>
</template>
