<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue"
import { useState } from "#imports"
import { motorCategoryLabels, motorFitments } from "~/data/motorFitmentData"
import type {
  MotorFitment,
  PublicBranch,
  PublicBranchRecommendation,
  PublicRecommendationResponse,
  PublicRecommendedProduct,
  PublicStockStatus,
  PublicTireSizesResponse,
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

const searchMode = useState<"motor" | "size">("finder-mode", () => "motor")
const selectedSize = useState("finder-size", () => "")
const sizeCatalog = useState<PublicTireSizesResponse | null>("finder-size-catalog", () => null)
const sizeQuery = ref("")
const isLoadingSizes = ref(false)
const sizeError = ref("")
const showAllSizes = ref(false)
let sizeController: AbortController | undefined
const selectedMotor = useState<MotorFitment | null>("finder-motor", () => null)
const searchQuery = ref(selectedMotor.value?.name ?? "")
const recommendation = useState<PublicRecommendationResponse | null>("finder-recommendation", () => null)
const showSuggestions = ref(false)
const isLoading = ref(false)
const errorMessage = ref("")
const activePosition = useState<PositionFilter>("finder-position", () => "front")
const selectedFrontProductKey = useState("finder-front", () => "")
const selectedRearProductKey = useState("finder-rear", () => "")
const selectedCity = ref("all")
const userLocation = ref<UserLocation | null>(null)
const locationMessage = ref("")
const locating = ref(false)
const showAllProducts = ref(false)
const showAllBranches = ref(false)
let requestSequence = 0
let requestController: AbortController | undefined
let suggestionTimer: ReturnType<typeof setTimeout> | undefined
const step = useState("finder-step", () => 1)
const direction = ref("forward")
const panelHost = ref<HTMLElement | null>(null)
const suggestionIndex = ref(-1)
const announcement = ref("")
const steps = computed(() => searchMode.value === "size"
  ? [{ id: 1, label: "Ukuran" }, { id: 3, label: "Tipe ban" }, { id: 4, label: "Cabang" }]
  : [{ id: 1, label: "Motor" }, { id: 2, label: "Posisi" }, { id: 3, label: "Tipe ban" }, { id: 4, label: "Cabang" }])
const stepIndex = computed(() => steps.value.findIndex(item => item.id === step.value))
const hasSelection = computed(() => searchMode.value === "size" ? !!selectedSize.value : !!selectedMotor.value)
const cleanSizeQuery = (value: string) => value.replace(/[\s/–—-]/g, "").toLowerCase()
const filteredSizes = computed(() => (sizeCatalog.value?.sizes ?? []).filter(size => cleanSizeQuery(size).includes(cleanSizeQuery(sizeQuery.value))))
const visibleSizes = computed(() => showAllSizes.value || sizeQuery.value.trim() ? filteredSizes.value : filteredSizes.value.slice(0, 12))
function stepNumber(id: number): string { return String(steps.value.findIndex(item => item.id === id) + 1).padStart(2, "0") }
const activeProduct = computed(() => activePosition.value === "front" ? selectedFrontProduct.value : selectedRearProduct.value)
const activeSize = computed(() => searchMode.value === "size" ? selectedSize.value : activePosition.value === "front" ? selectedMotor.value?.front : selectedMotor.value?.rear)
const otherPosition = computed<PositionFilter>(() => activePosition.value === "front" ? "rear" : "front")
const otherSelected = computed(() => activePosition.value === "front" ? selectedRearProduct.value : selectedFrontProduct.value)
function canVisitStep(target: number): boolean {
  return target === 1 || (target === 2 && searchMode.value === "motor" && !!selectedMotor.value) || (target === 3 && hasSelection.value && step.value >= 3) || (target === 4 && selectedProducts.value.length > 0)
}
function goToStep(target: number): void {
  if (target === step.value) return
  direction.value = target < step.value ? "back" : "forward"
  step.value = target
  showSuggestions.value = false
}
function choosePosition(position: PositionFilter): void {
  direction.value = "forward"
  activePosition.value = position
  showAllProducts.value = false
  goToStep(3)
  announcement.value = `Ban ${position === "front" ? "depan" : "belakang"} dipilih. Pilih tipe ban yang Anda inginkan.`
}
function lockPanelHeight(): void {
  if (panelHost.value) panelHost.value.style.height = `${panelHost.value.offsetHeight}px`
}
function sizePanel(element: Element): void {
  if (panelHost.value) panelHost.value.style.height = `${(element as HTMLElement).offsetHeight}px`
}
async function finishStep(): Promise<void> {
  if (panelHost.value) panelHost.value.style.height = ""
  await nextTick()
  panelHost.value?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true })
}
function suggestionKey(event: KeyboardEvent): void {
  if (event.key === "Escape") { showSuggestions.value = false; return }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault()
    showSuggestions.value = true
    const count = filteredMotors.value.length
    if (count) suggestionIndex.value = (suggestionIndex.value + (event.key === "ArrowDown" ? 1 : count - 1) + count) % count
  }
  if (event.key === "Enter" && showSuggestions.value) {
    const motor = filteredMotors.value[Math.max(0, suggestionIndex.value)]
    if (motor) { event.preventDefault(); void selectMotor(motor) }
  }
}
onMounted(() => {
  if (searchMode.value === "size") void loadSizes()
  if (hasSelection.value && !recommendation.value) void loadRecommendations()
})
onBeforeUnmount(() => {
  requestSequence++
  requestController?.abort()
  sizeController?.abort()
  clearTimeout(suggestionTimer)
})


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
    (product) => searchMode.value === "size" || product.position === activePosition.value || product.position === "both",
  )
  return showAllProducts.value ? matching : matching.slice(0, 8)
})

const productCountForPosition = computed(() =>
  (recommendation.value?.products ?? []).filter(
    (product) => searchMode.value === "size" || product.position === activePosition.value || product.position === "both",
  ).length,
)

const fallbackContact = computed(() => {
  const branch = rankedBranches.value[0]?.branch ?? props.branches[0]
  return branch ? contactLink(branch) : "/cabang"
})

async function loadSizes(force = false): Promise<void> {
  if (sizeCatalog.value && !force) return
  sizeController?.abort()
  const controller = new AbortController()
  sizeController = controller
  isLoadingSizes.value = true
  sizeError.value = ""
  try {
    const response = await $fetch<PublicTireSizesResponse>("/api/public/sizes", { signal: controller.signal })
    if (!controller.signal.aborted) sizeCatalog.value = response
  } catch {
    if (!controller.signal.aborted) sizeError.value = "Daftar ukuran belum dapat dimuat. Silakan coba lagi."
  } finally {
    if (!controller.signal.aborted) isLoadingSizes.value = false
  }
}
function resetProducts(): void {
  requestSequence++
  requestController?.abort()
  isLoading.value = false
  errorMessage.value = ""
  recommendation.value = null
  selectedFrontProductKey.value = ""
  selectedRearProductKey.value = ""
  activePosition.value = "front"
  selectedCity.value = "all"
  showAllProducts.value = false
  showAllBranches.value = false
}
function setSearchMode(mode: "motor" | "size"): void {
  if (mode === searchMode.value) return
  resetProducts()
  searchMode.value = mode
  selectedMotor.value = null
  selectedSize.value = ""
  searchQuery.value = ""
  sizeQuery.value = ""
  showAllSizes.value = false
  showSuggestions.value = false
  if (mode === "size") void loadSizes()
}
async function selectSize(size: string): Promise<void> {
  if (!sizeCatalog.value?.sizes.includes(size)) return
  resetProducts()
  selectedSize.value = size
  selectedMotor.value = null
  goToStep(3)
  announcement.value = `Ukuran ${size} dipilih. Pilih tipe ban yang Anda inginkan.`
  await loadRecommendations()
}
async function loadRecommendations(): Promise<void> {
  if (!hasSelection.value) return
  const query = searchMode.value === "size" ? { size: selectedSize.value } : { motorId: selectedMotor.value!.id }
  const sequence = ++requestSequence
  requestController?.abort()
  requestController = new AbortController()
  errorMessage.value = ""
  isLoading.value = true
  try {
    const response = await $fetch<PublicRecommendationResponse>("/api/public/recommendations", {
      query, signal: requestController.signal,
    })
    if (sequence === requestSequence) recommendation.value = response
  } catch {
    if (sequence === requestSequence) errorMessage.value = "Stok belum dapat dimuat. Coba lagi atau tanyakan langsung ke cabang."
  } finally {
    if (sequence === requestSequence) isLoading.value = false
  }
}
async function selectMotor(motor: MotorFitment): Promise<void> {
  resetProducts()
  selectedMotor.value = motor
  selectedSize.value = ""
  searchQuery.value = motor.name
  showSuggestions.value = false
  announcement.value = `${motor.name} dipilih. Sekarang tentukan ban depan atau belakang.`
  goToStep(2)
  await loadRecommendations()
}
function handleInput(): void {
  requestSequence++
  requestController?.abort()
  isLoading.value = false
  selectedMotor.value = null
  recommendation.value = null
  selectedFrontProductKey.value = ""
  selectedRearProductKey.value = ""
  errorMessage.value = ""
  suggestionIndex.value = -1
  showSuggestions.value = true
}
function closeSuggestions(): void {
  clearTimeout(suggestionTimer)
  suggestionTimer = setTimeout(() => { showSuggestions.value = false }, 160)
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
  announcement.value = isProductSelected(product) ? `${product.brand} ${product.type} dipilih. Lanjutkan untuk melihat cabang.` : "Pilihan ban dihapus."
}

function clearProductSelection(position: PositionFilter): void {
  if (position === "front") selectedFrontProductKey.value = ""
  else selectedRearProductKey.value = ""
  showAllBranches.value = false
  if (!selectedProducts.value.length && step.value === 4) goToStep(3)
}

function instagramUrl(handle: string): string {
  return `https://instagram.com/${handle.replace(/^@/, "")}`
}

function whatsappMessage(branch: PublicBranch): string {
  const motor = selectedMotor.value
  if (!hasSelection.value) return `Halo ${branch.name}, saya ingin konsultasi ban motor.`
  const lines = [
    `Halo ${branch.name}, saya cek ban melalui website Mister Ban.`,
    ...(searchMode.value === "size" ? [`Ukuran ban: ${selectedSize.value}`] : motor ? [
      `Motor: ${motor.name}`, `Ukuran depan: ${motor.front}`, `Ukuran belakang: ${motor.rear}`,
    ] : []),
  ]
  if (selectedFrontProduct.value) {
    lines.push(`Pilihan ${searchMode.value === "size" ? "ban" : "depan"}: ${selectedFrontProduct.value.brand} ${selectedFrontProduct.value.type}`)
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
  <div id="cek-ban" class="finder-card journey" :class="`journey--${direction}`">
    <nav class="journey-progress" aria-label="Langkah mencari ban" :style="{ '--journey-steps': steps.length }">
      <div class="journey-progress__inner">
        <div class="journey-progress__track" aria-hidden="true" :style="{ left: `${50 / steps.length}%`, right: `${50 / steps.length}%` }"><span :style="{ transform: `scaleX(${stepIndex / (steps.length - 1)})` }" /></div>
        <ol>
          <li v-for="(item, index) in steps" :key="item.id" :class="{ 'is-current': step === item.id, 'is-done': step > item.id }">
            <button type="button" :disabled="!canVisitStep(item.id)" :aria-current="step === item.id ? 'step' : undefined" @click="goToStep(item.id)">
              <span class="journey-progress__number"><svg v-if="step > item.id" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10 3 3 7-7" /></svg><span v-else>{{ index + 1 }}</span></span>
              <span>{{ item.label }}</span>
            </button>
          </li>
        </ol>
      </div>
    </nav>
    <p class="journey-sr" role="status" aria-live="polite">{{ announcement }}</p>
    <div v-if="hasSelection && step > 1" class="journey-motor">
      <span class="journey-check" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="m5 10 3 3 7-7" /></svg></span>
      <div><span>{{ searchMode === "size" ? "Ukuran ban" : "Motor Anda" }}</span><strong>{{ searchMode === "size" ? selectedSize : selectedMotor?.name }}</strong></div>
      <button type="button" @click="goToStep(1)">{{ searchMode === "size" ? "Ganti ukuran" : "Ganti motor" }}</button>
    </div>
    <div v-if="step === 1" class="journey-search-modes" role="group" aria-label="Cara mencari ban">
      <button type="button" :aria-pressed="searchMode === 'motor'" @click="setSearchMode('motor')">Berdasarkan motor</button>
      <button type="button" :aria-pressed="searchMode === 'size'" @click="setSearchMode('size')">Berdasarkan ukuran</button>
    </div>
    <div ref="panelHost" class="journey-panel-host">
      <Transition name="journey-panel" mode="out-in" @before-leave="lockPanelHeight" @enter="sizePanel" @after-enter="finishStep">
        <section :key="`${searchMode}-${step}-${step === 3 ? activePosition : ''}`" class="journey-panel" :aria-labelledby="`journey-heading-${step}`">
          <template v-if="step === 1 && searchMode === 'motor'">
            <p class="public-kicker">01 / Kenali motor Anda</p>
            <h2 id="journey-heading-1" tabindex="-1">Motor apa yang Anda pakai?</h2>
            <p class="journey-description">Mulai dengan nama motor. Kami bantu menemukan ukuran bannya.</p>
            <label class="finder-label" for="motor-search">Nama atau tipe motor</label>
            <div class="finder-search">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" /></svg>
              <input id="motor-search" v-model="searchQuery" type="search" role="combobox" placeholder="Contoh: Beat, NMAX, Vario" autocomplete="off" aria-autocomplete="list" :aria-expanded="showSuggestions" aria-controls="motor-suggestions" :aria-activedescendant="showSuggestions && suggestionIndex >= 0 ? `motor-option-${suggestionIndex}` : undefined" @input="handleInput" @focus="showSuggestions = true" @blur="closeSuggestions" @keydown="suggestionKey" />
              <div v-if="showSuggestions" id="motor-suggestions" class="finder-suggestions" role="listbox" aria-label="Pilihan motor">
                <button v-for="(motor, index) in filteredMotors" :id="`motor-option-${index}`" :key="motor.id" type="button" role="option" :aria-selected="suggestionIndex === index" tabindex="-1" @pointerdown.prevent @click="selectMotor(motor)">
                  <span><strong>{{ motor.name }}</strong><small>{{ motorCategoryLabels[motor.category] }}</small></span><span aria-hidden="true">Pilih &#8594;</span>
                </button>
                <div v-if="filteredMotors.length === 0" class="finder-not-found"><strong>Motor belum ada di daftar.</strong><span>Tim cabang dapat membantu mengecek ukuran secara langsung.</span><a :href="fallbackContact" target="_blank" rel="noreferrer">Konsultasi dengan cabang &#8599;</a></div>
              </div>
            </div>
            <div class="finder-popular"><span>Sering dicari:</span><button v-for="motor in popularMotors" :key="motor.id" type="button" @click="selectMotor(motor)">{{ motor.name.replace(/^(Honda|Yamaha)\s/, "") }}</button></div>
            <div class="journey-reassurance"><span aria-hidden="true">&#8594;</span><p>Dari ukuran yang pas sampai cabang tujuan.<br /><strong>Semua bisa Anda cek di sini.</strong></p></div>
            <button v-if="selectedMotor" type="button" class="journey-next" @click="goToStep(2)">Lanjut dengan {{ selectedMotor.name }} <span aria-hidden="true">&#8594;</span></button>
          </template>

          <template v-else-if="step === 1 && searchMode === 'size'">
            <p class="public-kicker">01 / Mulai dari ukuran</p>
            <h2 id="journey-heading-1" tabindex="-1">Sudah tahu ukuran ban Anda?</h2>
            <p class="journey-description">Pilih ukuran sesuai tulisan pada ban. Kami tampilkan tipe ban dan cabang yang memiliki stok.</p>
            <label class="finder-label" for="tire-size-search">Cari ukuran ban</label>
            <div class="finder-search">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" /></svg>
              <input id="tire-size-search" v-model="sizeQuery" type="search" placeholder="Contoh: 80/90-14 atau 90/90" autocomplete="off" aria-describedby="tire-size-hint" />
            </div>
            <p id="tire-size-hint" class="finder-note">Ukuran mengikuti katalog ban kami. Cocokkan juga dengan spesifikasi kendaraan Anda.</p>
            <div v-if="isLoadingSizes" class="journey-loading" role="status"><p><span class="journey-loading-dot" />Memuat pilihan ukuran...</p></div>
            <div v-else-if="sizeError" class="journey-error" role="alert"><p>{{ sizeError }}</p><button type="button" class="journey-back" @click="loadSizes(true)">Coba lagi <span aria-hidden="true">&#8594;</span></button></div>
            <template v-else-if="sizeCatalog">
              <p class="journey-size-count" role="status">{{ filteredSizes.length }} ukuran{{ sizeQuery.trim() ? ' ditemukan' : ' dalam katalog' }}</p>
              <div v-if="visibleSizes.length" class="journey-sizes" aria-label="Pilihan ukuran ban">
                <button v-for="size in visibleSizes" :key="size" type="button" :aria-pressed="selectedSize === size" @click="selectSize(size)"><span>{{ size }}</span><span aria-hidden="true">&#8594;</span></button>
              </div>
              <div v-else class="finder-empty"><p>{{ sizeCatalog.sizes.length ? 'Ukuran belum ditemukan. Coba kata pencarian lain.' : 'Pilihan ukuran belum tersedia.' }}</p><a :href="fallbackContact" target="_blank" rel="noreferrer">Tanya ukuran ke cabang &#8599;</a></div>
              <button v-if="!sizeQuery.trim() && filteredSizes.length > 12" type="button" class="finder-more" @click="showAllSizes = !showAllSizes">{{ showAllSizes ? 'Tampilkan lebih sedikit' : `Lihat semua ${filteredSizes.length} ukuran` }}</button>
            </template>
          </template>

          <template v-else-if="step === 2 && selectedMotor">
            <p class="public-kicker">02 / Tentukan posisi</p>
            <h2 id="journey-heading-2" tabindex="-1">Ban mana yang ingin diganti?</h2>
            <p class="journey-description">Pilih satu dulu. Anda bisa menambahkan ban lainnya setelah ini.</p>
            <div class="journey-positions">
              <button v-for="position in (['front', 'rear'] as const)" :key="position" type="button" class="journey-position" :data-position="position" @click="choosePosition(position)">
                <svg class="journey-motor-diagram" viewBox="0 0 220 120" aria-hidden="true">
                  <g class="scooter-wheels">
                    <circle cx="50" cy="94" r="21" :class="{ 'is-wheel': position === 'rear' }" />
                    <circle cx="178" cy="94" r="21" :class="{ 'is-wheel': position === 'front' }" />
                    <circle cx="50" cy="94" r="12" /><circle cx="178" cy="94" r="12" />
                    <path d="m50 82 0 24m-12-12h24m116-12v24m-12-12h24" />
                    <circle cx="50" cy="94" r="4" :class="{ 'wheel-center': position === 'rear' }" />
                    <circle cx="178" cy="94" r="4" :class="{ 'wheel-center': position === 'front' }" />
                  </g>
                  <path class="scooter-fork" d="m163 61 15 33" />
                  <path class="scooter-body" d="m20 47 34 6 39 7 17 20h20l17-35-5-12 12-8 17 16 8 19-18 21-13 9H95L76 73 37 66 20 59Z" />
                  <path class="scooter-panel" d="m25 54 56 12 15 18-24-15-30-5Zm127-17 15 9 6 14-19 16 7-22Z" />
                  <path class="scooter-seat" d="m27 42 31 3 32 8 9 6-10 1-33-7-29-5Z" />
                  <path d="m22 44-8-5m12 23-13 14-5-1m93 11h40m-39 8 6 7m58-22c8-6 19-6 28 0M139 26l13-4 11 8m-17-7-6-12m17 15 8-12" />
                  <path class="scooter-light" d="m164 44 10 14-9 3-6-12ZM21 49l10 3-5 6-8-4Z" />
                  <path class="scooter-mirror" d="m131 7 9 1 3 5-10-1Zm33 3 9-3 3 4-10 3Z" />
                  <path class="scooter-engine" d="M49 87h34l9 7-8 7H49a7 7 0 0 1 0-14Z" />
                  <path d="M56 93h23m-37-27-7 12m7-10-7 12m33-11 12 3m-16-6 11 3" />
                </svg>
                <span>Ban {{ position === 'front' ? 'depan' : 'belakang' }}</span><strong>{{ position === 'front' ? selectedMotor.front : selectedMotor.rear }}</strong><small>Pilih posisi <span aria-hidden="true">&#8594;</span></small>
              </button>
            </div>
            <p class="finder-note">Ukuran dapat berbeda menurut tahun atau varian. Cocokkan dengan tulisan pada ban atau buku kendaraan.</p>
            <button type="button" class="journey-back" @click="goToStep(1)"><span aria-hidden="true">&#8592;</span> Pilih motor lain</button>
          </template>

          <template v-else-if="step === 3">
            <p class="public-kicker">{{ stepNumber(3) }} / Pilih tipe ban</p>
            <h2 id="journey-heading-3" tabindex="-1">{{ searchMode === 'size' ? 'Pilihan ban ukuran ' + selectedSize + '.' : 'Pilihan untuk ban ' + (activePosition === 'front' ? 'depan' : 'belakang') + '.' }}</h2>
            <div class="journey-position-summary"><strong>{{ activeSize }}</strong><button type="button" @click="goToStep(searchMode === 'size' ? 1 : 2)">{{ searchMode === "size" ? "Ganti ukuran" : "Ganti posisi" }}</button></div>
            <div v-if="isLoading" class="journey-loading" role="status"><p><span class="journey-loading-dot" />Mencari pilihan yang sesuai...</p><div class="journey-skeletons" aria-hidden="true"><span v-for="n in 4" :key="n" /></div></div>
            <div v-else-if="errorMessage" class="journey-error" role="alert"><p>{{ errorMessage }}</p><button type="button" class="journey-next" @click="loadRecommendations()">Coba lagi <span aria-hidden="true">&#8594;</span></button><a :href="fallbackContact" target="_blank" rel="noreferrer">Tanya cabang &#8599;</a></div>
            <template v-else-if="recommendation">
              <p class="journey-description">{{ productCountForPosition }} pilihan sesuai ukuran. Pilih satu untuk melihat stok cabang.</p>
              <div v-if="productsForPosition.length" class="finder-products">
                <button v-for="product in productsForPosition" :key="product.key" type="button" class="finder-product" :class="{ 'is-selected': isProductSelected(product) }" :aria-pressed="isProductSelected(product)" @click="selectProduct(product)">
                  <div><span>{{ product.brand }}</span><strong>{{ product.type }}</strong><small>{{ product.size }}</small></div>
                  <div class="finder-product__meta"><span class="journey-choice-check" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="m5 10 3 3 7-7" /></svg></span><small>{{ isProductSelected(product) ? 'Dipilih' : `${productBranchCount(product)} cabang` }}</small></div>
                </button>
              </div>
              <div v-else class="finder-empty"><p>Belum ada stok untuk ukuran ini.</p><a :href="fallbackContact" target="_blank" rel="noreferrer">Tanya cabang untuk pilihan lain &#8599;</a></div>
              <button v-if="productCountForPosition > 8" type="button" class="finder-more" @click="showAllProducts = !showAllProducts">{{ showAllProducts ? 'Tampilkan lebih sedikit' : `Lihat semua ${productCountForPosition} pilihan` }}</button>
              <div class="journey-continue">
                <Transition name="journey-feedback" mode="out-in"><p :key="activeProduct?.key ?? 'empty'" class="journey-selection-note">{{ activeProduct ? `${activeProduct.brand} ${activeProduct.type} dipilih.` : 'Pilih tipe ban untuk melanjutkan.' }}</p></Transition>
                <button type="button" class="journey-next" :disabled="!activeProduct" @click="goToStep(4)">Cek cabang <span v-if="activeProduct" class="journey-count">{{ rankedBranches.length }}</span><span aria-hidden="true">&#8594;</span></button>
                <button v-if="searchMode === 'motor' && activeProduct && !otherSelected" type="button" class="journey-add" @click="choosePosition(otherPosition)">+ Tambah ban {{ otherPosition === 'front' ? 'depan' : 'belakang' }}</button>
                <p v-if="searchMode === 'motor' && otherSelected" class="journey-added">Ban {{ otherPosition === 'front' ? 'depan' : 'belakang' }} juga dipilih: {{ otherSelected.brand }} {{ otherSelected.type }}</p>
              </div>
              <small class="journey-updated">Stok diperbarui {{ formatUpdatedAt(recommendation.updatedAt) }}</small>
            </template>
          </template>

          <template v-else-if="step === 4">
            <p class="public-kicker">{{ stepNumber(4) }} / Siap ke toko</p>
            <h2 id="journey-heading-4" tabindex="-1">Temukan cabang tujuan Anda.</h2>
            <p class="journey-description">{{ branchHeading }}. Konfirmasi ketersediaan sebelum berangkat.</p>
            <div class="journey-order" aria-label="Ringkasan pilihan ban">
              <div v-for="position in (['front', 'rear'] as const)" :key="position">
                <template v-if="position === 'front' ? selectedFrontProduct : selectedRearProduct"><span>{{ searchMode === 'size' ? 'Ban pilihan' : position === 'front' ? 'Depan' : 'Belakang' }}</span><strong>{{ (position === 'front' ? selectedFrontProduct : selectedRearProduct)?.brand }} {{ (position === 'front' ? selectedFrontProduct : selectedRearProduct)?.type }}<small>{{ (position === 'front' ? selectedFrontProduct : selectedRearProduct)?.size }}</small></strong><button type="button" :aria-label="searchMode === 'size' ? 'Hapus pilihan ban' : `Hapus pilihan ban ${position === 'front' ? 'depan' : 'belakang'}`" @click="clearProductSelection(position)">&#215;</button></template>
              </div>
              <button type="button" class="journey-add" @click="goToStep(3)">Ubah pilihan ban</button>
            </div>
            <div class="finder-area-filter"><label for="branch-city">Area</label><select id="branch-city" v-model="selectedCity"><option value="all">Semua area</option><option v-for="city in cities" :key="city" :value="city">{{ city }}</option></select><button v-if="hasCoordinateData" type="button" class="finder-location" :disabled="locating" @click="useMyLocation">{{ locating ? 'Mencari lokasi...' : 'Gunakan lokasi saya' }}</button></div>
            <p v-if="locationMessage" class="finder-note" role="status">{{ locationMessage }}</p>
            <p class="journey-branch-count" role="status">{{ rankedBranches.length }} cabang untuk pilihan Anda</p>
            <div class="finder-branches">
              <article v-for="(item, index) in visibleBranches" :key="item.branch.code" class="finder-branch" :style="{ '--branch-order': Math.min(index, 3) }">
                <div class="finder-branch__top"><div><strong>{{ item.branch.name }}</strong><span>{{ item.branch.city }}</span></div><span class="stock-badge" :class="`is-${item.displayStatus}`">{{ statusLabel(item.displayStatus) }}</span></div>
                <p>{{ item.branch.address }}</p><small v-if="item.distance !== null">Sekitar {{ item.distance.toFixed(1) }} km dari Anda</small>
                <div class="finder-branch__actions"><a :href="item.branch.mapsUrl" target="_blank" rel="noreferrer">Petunjuk arah <span aria-hidden="true">&#8599;</span></a><a v-if="item.branch.whatsapp || item.branch.instagram" :href="contactLink(item.branch)" target="_blank" rel="noreferrer" class="is-primary">{{ contactLabel(item.branch) }} <span aria-hidden="true">&#8599;</span></a><NuxtLink v-else :to="`/cabang/${item.branch.slug}`" class="is-primary">Detail cabang <span aria-hidden="true">&#8594;</span></NuxtLink></div>
              </article>
            </div>
            <div v-if="rankedBranches.length === 0" class="finder-empty finder-empty--branches"><strong>Belum ada cabang yang cocok.</strong><span>Coba area lain atau ubah pilihan ban Anda.</span><button type="button" class="journey-back" @click="goToStep(3)">Ubah pilihan ban</button></div>
            <button v-if="rankedBranches.length > 4" type="button" class="finder-more" @click="showAllBranches = !showAllBranches">{{ showAllBranches ? 'Tampilkan lebih sedikit' : `Lihat semua ${rankedBranches.length} cabang` }}</button>
            <p class="journey-external-note">Petunjuk arah dan kontak toko dibuka di tab baru. Pilihan Anda tetap tersimpan di sini.</p>
          </template>
        </section>
      </Transition>
    </div>
  </div>
</template>
