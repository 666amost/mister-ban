<script setup lang="ts">
import { useSeoMeta } from "#imports"
import { computed, onBeforeUnmount, ref, type CSSProperties } from "vue"

definePageMeta({ layout: "auth" })

useSeoMeta({
  title: "Mister Ban | Spesialis Ban Motor – 7 Cabang Jakarta Barat & Tangerang",
  description:
    "Mister Ban menyediakan ban motor berkualitas dari brand Kingland, IRC, Maxxis, dan Zeneos. Tersedia di 7 cabang aktif di Jakarta Barat dan Tangerang.",
  ogTitle: "Mister Ban | Spesialis Ban Motor – 7 Cabang Jakarta Barat & Tangerang",
  ogDescription:
    "Ban motor berkualitas dari brand Kingland, IRC, Maxxis, dan Zeneos. Kunjungi 7 cabang aktif di Jakarta Barat dan Tangerang.",
  robots: "index, follow",
})

type NavMenuItem = {
  label: string
  href: string
  meta: string
}

type NavGroup = {
  id: string
  label: string
  eyebrow: string
  title: string
  description: string
  items: NavMenuItem[]
}

type HeroMetric = {
  value: string
  label: string
}

type ProductMetric = {
  label: string
  value: string
}

type StagePalette = {
  accent: string
  accentRgb: string
  accentSoft: string
  surfaceFrom: string
  surfaceTo: string
  surfaceGlow: string
}

type ProductLine = {
  id: string
  serial: string
  brand: string
  name: string
  series: string
  tagline: string
  fitment: string
  summary: string
  features: string[]
  metrics: ProductMetric[]
  imageAlt: string
  stagePalette: StagePalette
  imagePath?: string
}

type TechCard = {
  title: string
  description: string
}

type BranchFallback = {
  title: string
  area: string
  instagram: string | null
}

type PublicBranchCard = {
  title: string
  area: string
  instagram: string | null
}

const navGroups: NavGroup[] = [
  {
    id: "produk",
    label: "Brand",
    eyebrow: "Pilihan Merek",
    title: "Empat brand ban terpercaya tersedia di semua cabang Mister Ban.",
    description:
      "Pilih brand yang sesuai kebutuhan motor Anda, lalu kunjungi cabang terdekat untuk cek stok dan ukuran.",
    items: [
      { label: "Kingland Tiger", href: "#produk", meta: "Ban motor untuk jalanan kota" },
      { label: "IRC SS-530R", href: "#produk", meta: "Pilihan ban harian yang familiar" },
      { label: "Maxxis MA-3Di", href: "#produk", meta: "Ketahanan lebih lama untuk motor matic" },
      { label: "Zeneos ZN77", href: "#produk", meta: "Pilihan harga kompetitif" },
    ],
  },
  {
    id: "teknologi",
    label: "Layanan",
    eyebrow: "Layanan Kami",
    title: "Ban berkualitas untuk motor harian dengan pilihan brand yang sudah terpercaya.",
    description:
      "Kami menyediakan berbagai ukuran dan brand ban motor untuk kebutuhan penggantian rutin maupun perjalanan lebih jauh.",
    items: [
      { label: "Kingland, IRC, Maxxis, Zeneos", href: "#teknologi", meta: "Empat brand tersedia" },
      { label: "Stok Tersedia", href: "#jaringan", meta: "Hubungi cabang untuk cek stok" },
      { label: "Harga Bersaing", href: "#jaringan", meta: "Tanya langsung ke toko" },
    ],
  },
  {
    id: "jaringan",
    label: "Cabang",
    eyebrow: "Cabang Kami",
    title: "Tujuh cabang aktif di area Jakarta Barat dan Tangerang siap melayani Anda.",
    description:
      "Kunjungi atau hubungi cabang Mister Ban terdekat untuk menanyakan stok, ukuran, dan harga ban.",
    items: [
      { label: "Dunia Ban Kedoya", href: "#jaringan", meta: "Area Kedoya, Jakarta Barat" },
      { label: "Mister Ban Meruya", href: "#jaringan", meta: "Area Meruya, Jakarta Barat" },
      { label: "Gemilang Ban Ciledug", href: "#jaringan", meta: "Area Ciledug, Tangerang" },
    ],
  },
]

const tapeWords: string[] = [
  "Spesialis Ban Motor",
  "Kingland Tiger",
  "IRC SS-530R",
  "Maxxis MA-3Di",
  "Zeneos ZN77",
  "7 Cabang Aktif",
  "Jakarta Barat",
  "Tangerang",
  "Cek Stok ke Toko",
]

const stageLinePaths: string[] = [
  "M -120 150 C 120 20 330 30 510 150 S 890 360 1420 120",
  "M -120 195 C 140 65 350 75 530 195 S 910 405 1420 165",
  "M -120 240 C 160 110 370 120 550 240 S 930 450 1420 210",
  "M -120 285 C 180 155 390 165 570 285 S 950 495 1420 255",
  "M -120 330 C 200 200 410 210 590 330 S 970 540 1420 300",
  "M -120 375 C 220 245 430 255 610 375 S 990 585 1420 345",
  "M -120 420 C 240 290 450 300 630 420 S 1010 630 1420 390",
  "M -120 465 C 260 335 470 345 650 465 S 1030 675 1420 435",
]

const stageAccentPaths: string[] = [
  "M -120 360 C 140 220 360 230 560 320 S 920 430 1420 250",
  "M -120 460 C 170 320 410 330 640 430 S 1000 540 1420 350",
]

const heroMetrics: HeroMetric[] = [
  {
    value: "4 Brand",
    label: "Kingland, IRC, Maxxis, dan Zeneos tersedia di semua cabang.",
  },
  {
    value: "7 Cabang",
    label: "Aktif melayani di Jakarta Barat dan Tangerang.",
  },
  {
    value: "Stok Tersedia",
    label: "Hubungi cabang terdekat untuk cek stok dan harga.",
  },
]

const productLines: ProductLine[] = [
  {
    id: "kingland-tiger",
    serial: "01",
    brand: "Kingland",
    name: "Kingland Tiger",
    series: "Urban City",
    tagline: "Ban motor untuk jalanan kota dengan grip stabil di berbagai kondisi.",
    fitment: "Motor matic & bebek",
    summary:
      "Kingland Tiger Urban City dirancang untuk motor matic dan bebek yang aktif di jalanan kota. Tersedia dalam berbagai ukuran standar, cocok untuk kebutuhan harian maupun perjalanan lebih jauh.",
    features: [
      "Tersedia dalam berbagai ukuran standar.",
      "Cocok untuk motor matic dan bebek.",
    ],
    metrics: [
      { label: "Brand", value: "Kingland" },
      { label: "Tipe", value: "TT / TL" },
      { label: "Kategori", value: "Urban" },
    ],
    imageAlt: "Foto ban Kingland Tiger",
    stagePalette: {
      accent: "#24c466",
      accentRgb: "36, 196, 102",
      accentSoft: "#7de89d",
      surfaceFrom: "#052314",
      surfaceTo: "#0d3f24",
      surfaceGlow: "#177c42",
    },
    imagePath: "/brand/brand/kingland-tiger.png",
  },
  {
    id: "irc-ss-530r",
    serial: "02",
    brand: "IRC",
    name: "IRC SS-530R",
    series: "Sport Series",
    tagline: "Pilihan ban harian yang sudah dipercaya untuk berbagai motor.",
    fitment: "Motor matic & bebek",
    summary:
      "IRC SS-530R memberikan grip yang konsisten untuk pemakaian harian. Salah satu pilihan ban paling sering dicari di cabang Mister Ban, tersedia dalam banyak ukuran.",
    features: [
      "Grip stabil di jalan kering dan basah.",
      "Mudah ditemukan di semua cabang.",
    ],
    metrics: [
      { label: "Brand", value: "IRC" },
      { label: "Tipe", value: "TT / TL" },
      { label: "Kategori", value: "Harian" },
    ],
    imageAlt: "Foto ban IRC SS-530R",
    stagePalette: {
      accent: "#19b85f",
      accentRgb: "25, 184, 95",
      accentSoft: "#74e79b",
      surfaceFrom: "#052314",
      surfaceTo: "#0b3921",
      surfaceGlow: "#126d3a",
    },
    imagePath: "/brand/brand/IRC-SS-530r.png",
  },
  {
    id: "maxxis-ma-3di",
    serial: "03",
    brand: "Maxxis",
    name: "Maxxis MA-3Di",
    series: "Diamond Scooter",
    tagline: "Ketahanan lebih lama untuk motor matic dengan pemakaian intensif.",
    fitment: "Motor matic",
    summary:
      "Maxxis MA-3Di memberikan performa konsisten untuk motor matic yang digunakan setiap hari. Pilihan dari brand Maxxis yang sudah dikenal untuk ketahanan dan kenyamanan berkendara.",
    features: [
      "Daya tahan lebih lama dari pemakaian rutin.",
      "Performa konsisten untuk jarak jauh.",
    ],
    metrics: [
      { label: "Brand", value: "Maxxis" },
      { label: "Tipe", value: "TL" },
      { label: "Kategori", value: "Durable" },
    ],
    imageAlt: "Foto ban Maxxis MA-3Di",
    stagePalette: {
      accent: "#2fd173",
      accentRgb: "47, 209, 115",
      accentSoft: "#8af0ad",
      surfaceFrom: "#061f13",
      surfaceTo: "#0f4227",
      surfaceGlow: "#1b8549",
    },
    imagePath: "/brand/brand/Maxxis-Ma-3Di.png",
  },
  {
    id: "zeneos-zn77",
    serial: "04",
    brand: "Zeneos",
    name: "Zeneos ZN77",
    series: "Advanced Grip",
    tagline: "Pilihan ban motor harian dengan harga yang kompetitif.",
    fitment: "Motor matic",
    summary:
      "Zeneos ZN77 menawarkan performa ban harian yang baik dengan harga terjangkau. Tersedia di semua cabang Mister Ban untuk kebutuhan penggantian rutin.",
    features: [
      "Harga kompetitif untuk penggantian rutin.",
      "Tersedia di semua cabang.",
    ],
    metrics: [
      { label: "Brand", value: "Zeneos" },
      { label: "Tipe", value: "TL" },
      { label: "Kategori", value: "Value" },
    ],
    imageAlt: "Foto ban Zeneos ZN77",
    stagePalette: {
      accent: "#13a957",
      accentRgb: "19, 169, 87",
      accentSoft: "#69df91",
      surfaceFrom: "#041f12",
      surfaceTo: "#0a351f",
      surfaceGlow: "#116d38",
    },
    imagePath: "/brand/brand/Zeneos-zn77.png",
  },
]

const techCards: TechCard[] = [
  {
    title: "Empat brand pilihan",
    description:
      "Kingland, IRC, Maxxis, dan Zeneos tersedia dan bisa ditanyakan langsung ke cabang.",
  },
  {
    title: "Cek stok langsung",
    description:
      "Hubungi cabang terdekat untuk menanyakan stok, ukuran, dan harga ban yang tersedia.",
  },
  {
    title: "Tujuh lokasi aktif",
    description:
      "Cabang Mister Ban tersebar di area Jakarta Barat dan Tangerang.",
  },
]

const branchFallbacks: BranchFallback[] = [
  {
    title: "Dunia Ban Kedoya",
    area: "Kedoya",
    instagram: "@dunia_ban_kedoya",
  },
  {
    title: "Dunia Ban Kembangan",
    area: "Kembangan",
    instagram: "@dunia_ban_kembangan",
  },
  {
    title: "Mister Ban Meruya",
    area: "Meruya",
    instagram: "@misterbanmotor",
  },
  {
    title: "Mister Ban Karang Tengah",
    area: "Karang Tengah",
    instagram: "@misterbanmotor",
  },
  {
    title: "Mister Ban Gondrong",
    area: "Gondrong",
    instagram: "@m2tc.misterban.gondrong",
  },
  {
    title: "Gemilang Ban Paninggilan",
    area: "Paninggilan",
    instagram: "@m2tc.gemilangban.paninggilan",
  },
  {
    title: "Gemilang Ban Ciledug",
    area: "Ciledug",
    instagram: "@m2tc.gemilangban.ciledugindah",
  },
]

const defaultProductLine = productLines.at(0)

if (!defaultProductLine) {
  throw new Error("Expected at least one public product line")
}

const activeLineId = ref<string>(defaultProductLine.id)
const clickedLineId = ref<string | null>(null)
let traceTimer: ReturnType<typeof setTimeout> | null = null

const swipeDir = ref<'next' | 'prev'>('next')

function handleSwitcherClick(id: string): void {
  const currentIdx = productLines.findIndex((l) => l.id === activeLineId.value)
  const targetIdx = productLines.findIndex((l) => l.id === id)
  swipeDir.value = targetIdx >= currentIdx ? 'next' : 'prev'
  activeLineId.value = id
  clickedLineId.value = id
  if (traceTimer) clearTimeout(traceTimer)
  traceTimer = setTimeout(() => { clickedLineId.value = null }, 750)
}

const touchStartX = ref(0)

function handleStageTouchStart(e: TouchEvent): void {
  const t = e.touches.item(0)
  if (!t) return
  touchStartX.value = t.clientX
}

function handleStageTouchEnd(e: TouchEvent): void {
  const t = e.changedTouches.item(0)
  if (!t) return
  const delta = t.clientX - touchStartX.value
  if (Math.abs(delta) < 48) return
  const idx = productLines.findIndex((l) => l.id === activeLineId.value)
  const target = delta < 0
    ? productLines[(idx + 1) % productLines.length]
    : productLines[(idx - 1 + productLines.length) % productLines.length]
  if (target) handleSwitcherClick(target.id)
}

const activeLine = computed<ProductLine>(() => {
  return productLines.find((line) => line.id === activeLineId.value) ?? defaultProductLine
})

const activeStageModel = computed<string>(() => {
  return activeLine.value.name.replace(new RegExp(`^${activeLine.value.brand}\\s*`, "i"), "").toUpperCase()
})

const activeStageStyle = computed<CSSProperties>(() => {
  return {
    "--stage-accent": activeLine.value.stagePalette.accent,
    "--stage-accent-rgb": activeLine.value.stagePalette.accentRgb,
    "--stage-accent-soft": activeLine.value.stagePalette.accentSoft,
    "--stage-surface-from": activeLine.value.stagePalette.surfaceFrom,
    "--stage-surface-to": activeLine.value.stagePalette.surfaceTo,
    "--stage-surface-glow": activeLine.value.stagePalette.surfaceGlow,
  }
})

const publicBranches = computed<PublicBranchCard[]>(() => {
  return branchFallbacks.map((branch) => ({
    title: branch.title,
    area: branch.area,
    instagram: branch.instagram,
  }))
})

const activeNavId = ref<string | null>(null)
let closeNavTimer: ReturnType<typeof setTimeout> | null = null

const activeNav = computed<NavGroup | null>(() => {
  return navGroups.find((group) => group.id === activeNavId.value) ?? null
})

function openNav(navId: string) {
  cancelCloseNav()
  activeNavId.value = navId
}

function closeNav() {
  cancelCloseNav()
  activeNavId.value = null
}

function scheduleCloseNav() {
  cancelCloseNav()
  closeNavTimer = setTimeout(() => {
    activeNavId.value = null
    closeNavTimer = null
  }, 180)
}

function cancelCloseNav() {
  if (closeNavTimer) {
    clearTimeout(closeNavTimer)
    closeNavTimer = null
  }
}

function buildInstagramUrl(handle: string): string {
  return `https://instagram.com/${handle.replace(/^@/, "")}`
}

onBeforeUnmount(() => {
  cancelCloseNav()
})

const currentYear: number = new Date().getFullYear()
</script>

<template>
  <main class="pub-page">
    <header class="pub-topbar">
      <div class="pub-shell pub-topbar-inner">
        <NuxtLink to="/" class="pub-brand">
          <img class="pub-brand-logo" src="/brand/logo.png" alt="Mister Ban" />
          <span class="pub-brand-copy">
            <strong>Mister Ban</strong>
            <span>Spesialis ban motor. 7 cabang aktif.</span>
          </span>
        </NuxtLink>

        <div class="pub-nav-wrap" @mouseenter="cancelCloseNav" @mouseleave="scheduleCloseNav" @keydown.esc="closeNav">
          <nav class="pub-nav" aria-label="Public navigation">
            <button
              v-for="group in navGroups"
              :key="group.id"
              type="button"
              class="pub-nav-link"
              :class="{ 'is-active': group.id === activeNavId }"
              @mouseenter="openNav(group.id)"
              @focus="openNav(group.id)"
            >
              {{ group.label }}
            </button>
          </nav>

          <Transition name="pub-menu">
            <div v-if="activeNav" class="pub-menu-panel" @mouseenter="cancelCloseNav" @mouseleave="scheduleCloseNav">
              <div class="pub-menu-grid">
                <div class="pub-menu-copy">
                  <div class="pub-menu-eyebrow">{{ activeNav.eyebrow }}</div>
                  <h2 class="pub-menu-title">{{ activeNav.title }}</h2>
                  <p class="pub-menu-desc">{{ activeNav.description }}</p>
                </div>

                <div class="pub-menu-links">
                  <a v-for="item in activeNav.items" :key="item.label" class="pub-menu-link" :href="item.href" @click="closeNav">
                    <span class="pub-menu-link-copy">
                      <strong>{{ item.label }}</strong>
                      <span>{{ item.meta }}</span>
                    </span>
                    <span class="pub-menu-link-arrow">→</span>
                  </a>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <div class="pub-topbar-actions">
          <span class="pub-search">7 Cabang Aktif</span>
        </div>
      </div>
    </header>

    <section class="pub-hero">
      <div class="pub-shell">
        <div class="pub-hero-grid">
          <svg class="pub-hero-lines" viewBox="0 0 1320 720" preserveAspectRatio="none" aria-hidden="true">
            <path v-for="path in stageLinePaths" :key="path" :d="path" class="pub-hero-line" />
            <path
              v-for="path in stageAccentPaths"
              :key="`accent-${path}`"
              :d="path"
              class="pub-hero-line pub-hero-line--accent"
            />
          </svg>

          <div class="pub-hero-copy">
            <div class="pub-overline">Ban Motor Berkualitas</div>
            <h1 class="pub-hero-title">Pilihan ban motor untuk kebutuhan harian Anda.</h1>
            <p class="pub-hero-desc">
              Tersedia brand Kingland, IRC, Maxxis, dan Zeneos di cabang Mister Ban Jakarta Barat dan Tangerang.
            </p>

            <div class="pub-hero-actions">
              <a class="pub-btn pub-btn--primary" href="#produk">Lihat Pilihan Ban</a>
              <a class="pub-btn pub-btn--ghost" href="#jaringan">Temukan Cabang</a>
            </div>

            <div class="pub-switcher">
              <button
                v-for="line in productLines"
                :key="line.id"
                type="button"
                class="pub-switcher-item"
                :class="{ 'is-active': line.id === activeLine.id, 'is-traced': clickedLineId === line.id }"
                @click="handleSwitcherClick(line.id)"
              >
                <span class="pub-switcher-index">{{ line.serial }}</span>
                <span class="pub-switcher-text">
                  <strong>{{ line.name }}</strong>
                  <span>{{ line.fitment }}</span>
                </span>
              </button>
            </div>
          </div>

          <div class="pub-stage" :style="activeStageStyle">
            <div class="pub-stage-lane pub-stage-lane--one" />
            <div class="pub-stage-lane pub-stage-lane--two" />
            <div class="pub-stage-aura" />

            <div class="pub-stage-frame" @touchstart.passive="handleStageTouchStart" @touchend.passive="handleStageTouchEnd">
              <Transition :name="`pub-stage-scene-${swipeDir}`" mode="out-in">
                <div :key="`stage-${activeLine.id}`" class="pub-stage-scene">
                  <svg class="pub-stage-poster" viewBox="0 0 720 620" preserveAspectRatio="none" aria-hidden="true">
                    <rect x="0" y="0" width="720" height="620" rx="40" fill="rgba(255, 255, 255, 0.02)" />
                    <circle cx="552" cy="184" r="176" :fill="activeLine.stagePalette.surfaceGlow" fill-opacity="0.34" />
                    <circle cx="560" cy="192" r="132" fill="none" class="pub-stage-poster-orbit" />
                    <circle cx="560" cy="192" r="188" fill="none" class="pub-stage-poster-orbit pub-stage-poster-orbit--soft" />
                    <path d="M 22 114 C 162 22 322 14 446 92 S 658 266 764 182" class="pub-stage-poster-line" />
                    <path d="M 6 178 C 166 80 322 72 454 150 S 658 330 760 244" class="pub-stage-poster-line pub-stage-poster-line--soft" />
                    <path d="M 54 62 H 306" class="pub-stage-poster-rule" />
                    <path d="M 54 470 H 314" class="pub-stage-poster-rule pub-stage-poster-rule--accent" />
                    <g class="pub-stage-poster-slashes" transform="translate(328 446)">
                      <rect x="0" y="0" width="10" height="54" rx="5" />
                      <rect x="18" y="0" width="10" height="54" rx="5" />
                      <rect x="36" y="0" width="10" height="54" rx="5" />
                    </g>
                    <text x="48" y="164" class="pub-stage-poster-serial">{{ activeLine.serial }}</text>
                    <text x="56" y="110" class="pub-stage-poster-brand">{{ activeLine.brand.toUpperCase() }}</text>
                    <text x="56" y="430" class="pub-stage-poster-title">{{ activeStageModel }}</text>
                    <text x="56" y="514" class="pub-stage-poster-series">{{ activeLine.series.toUpperCase() }}</text>

                    <g
                      v-for="(metric, index) in activeLine.metrics"
                      :key="`${activeLine.id}-${metric.label}`"
                      class="pub-stage-poster-chip"
                      :transform="`translate(${56 + index * 154} 540)`"
                    >
                      <rect width="138" height="52" rx="20" />
                      <text x="18" y="21" class="pub-stage-poster-chip-label">{{ metric.label }}</text>
                      <text x="18" y="39" class="pub-stage-poster-chip-value">{{ metric.value }}</text>
                    </g>
                  </svg>

                  <div class="pub-stage-visual" :class="`is-${activeLine.id}`">
                    <img v-if="activeLine.imagePath" class="pub-stage-photo" :src="activeLine.imagePath" :alt="activeLine.imageAlt" />

                    <div v-else class="pub-wheel">
                      <div class="pub-wheel-ring pub-wheel-ring--outer" />
                      <div class="pub-wheel-ring pub-wheel-ring--mid" />
                      <div class="pub-wheel-ring pub-wheel-ring--inner" />
                      <div class="pub-wheel-spoke pub-wheel-spoke--a" />
                      <div class="pub-wheel-spoke pub-wheel-spoke--b" />
                      <div class="pub-wheel-spoke pub-wheel-spoke--c" />
                      <div class="pub-wheel-core" />
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="pub-tape" aria-label="Product themes">
      <div class="pub-tape-track" aria-hidden="true">
        <span v-for="word in tapeWords" :key="`a-${word}`" class="pub-tape-word">{{ word }}</span>
        <span v-for="word in tapeWords" :key="`b-${word}`" class="pub-tape-word">{{ word }}</span>
      </div>
    </section>

    <section class="pub-metrics">
      <div class="pub-shell pub-metric-grid">
        <article v-for="metric in heroMetrics" :key="metric.value" class="pub-metric-card">
          <div class="pub-metric-value">{{ metric.value }}</div>
          <p class="pub-metric-label">{{ metric.label }}</p>
        </article>
      </div>
    </section>

    <section id="produk" class="pub-section pub-section--dark">
      <div class="pub-shell pub-product-grid">
        <div class="pub-product-copy">
          <div class="pub-kicker pub-kicker--dark">Pilihan Ban</div>
          <h2 class="pub-heading pub-heading--light">Pilih brand yang sesuai dengan motor Anda.</h2>
          <p class="pub-body pub-body--light">
            Tersedia pilihan ban untuk motor matic dan bebek dari empat brand terpercaya.
          </p>

          <div class="pub-product-list">
            <button
              v-for="line in productLines"
              :key="`detail-${line.id}`"
              type="button"
              class="pub-product-item"
              :class="{ 'is-active': line.id === activeLine.id, 'is-traced': clickedLineId === line.id }"
              @click="handleSwitcherClick(line.id)"
            >
              <span class="pub-product-serial">{{ line.serial }}</span>
              <span class="pub-product-meta">
                <strong>{{ line.name }}</strong>
                <span>{{ line.fitment }}</span>
              </span>
            </button>
          </div>
        </div>

        <div class="pub-product-detail">
          <Transition name="pub-detail-swap" mode="out-in">
            <div :key="`detail-${activeLine.id}`" class="pub-detail-panel">
              <div class="pub-detail-head">
                <span class="pub-detail-serial">{{ activeLine.serial }}</span>
                <span class="pub-detail-fitment">{{ activeLine.fitment }}</span>
              </div>

              <h3 class="pub-detail-title">{{ activeLine.name }}</h3>
              <p class="pub-detail-desc">{{ activeLine.summary }}</p>

              <div class="pub-detail-metrics">
                <article v-for="metric in activeLine.metrics" :key="`${activeLine.id}-${metric.label}`" class="pub-detail-metric">
                  <span>{{ metric.label }}</span>
                  <strong>{{ metric.value }}</strong>
                </article>
              </div>

              <div class="pub-feature-list">
                <div v-for="feature in activeLine.features" :key="feature" class="pub-feature-item">
                  <div class="pub-feature-dot" />
                  <span>{{ feature }}</span>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </section>

    <section id="teknologi" class="pub-section">
      <div class="pub-shell">
        <div class="pub-section-head">
          <div class="pub-kicker">Layanan Kami</div>
          <h2 class="pub-heading">Belanja ban motor jadi lebih mudah.</h2>
          <p class="pub-body">
            Pilih brand yang sesuai, cek cabang terdekat, lalu datang untuk konsultasi ukuran dan ketersediaan ban.
          </p>
        </div>

        <div class="pub-tech-grid">
          <article v-for="card in techCards" :key="card.title" class="pub-tech-card">
            <h3 class="pub-tech-title">{{ card.title }}</h3>
            <p class="pub-tech-desc">{{ card.description }}</p>
          </article>
        </div>
      </div>
    </section>

    <section id="jaringan" class="pub-section pub-section--accent">
      <div class="pub-shell pub-network-grid">
        <div class="pub-network-copy">
          <div class="pub-kicker">Cabang Kami</div>
          <h2 class="pub-heading">Datang ke cabang Mister Ban terdekat.</h2>
          <p class="pub-body">
            Setiap cabang siap membantu cek stok, ukuran, dan pilihan ban motor yang sesuai.
          </p>

          <div class="pub-network-actions">
            <a class="pub-btn pub-btn--primary" href="#produk">Lihat Pilihan Ban</a>
          </div>
        </div>

        <div class="pub-network-panel">
          <article v-for="branch in publicBranches" :key="branch.title" class="pub-network-card">
            <div class="pub-branch-head">
              <div>
                <h3 class="pub-network-title">{{ branch.title }}</h3>
                <p class="pub-branch-area">Area {{ branch.area }}</p>
              </div>
            </div>
            <div v-if="branch.instagram" class="pub-branch-meta">
              <a
                class="pub-branch-link"
                :href="buildInstagramUrl(branch.instagram)"
                target="_blank"
                rel="noreferrer"
              >
                {{ branch.instagram }}
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>

    <footer class="pub-footer">
      <div class="pub-shell pub-footer-inner">
        <div>
          <div class="pub-footer-brand">Mister Ban</div>
          <p class="pub-footer-copy">Pilihan ban motor dari brand terpercaya untuk kebutuhan harian di Jakarta Barat dan Tangerang.</p>
        </div>
        <p class="pub-copyright">© {{ currentYear }} Mister Ban. Semua hak dilindungi.</p>
      </div>
    </footer>
  </main>
</template>

<style scoped>
:global(html),
:global(body) {
  background: #ffffff;
}

:global(body) {
  scrollbar-color: #0f7a3d #e1ede4;
}

:global(body::-webkit-scrollbar) {
  width: 12px;
}

:global(body::-webkit-scrollbar-track) {
  background: #e1ede4;
}

:global(body::-webkit-scrollbar-thumb) {
  border: 3px solid #e1ede4;
  border-radius: 999px;
  background: #0f7a3d;
}

.pub-page {
  --mb-accent: #118342;
  --mb-accent2: #0b6533;
  --mb-accent-rgb: 17, 131, 66;
  --mb-accent-ink: #ffffff;
  --pub-green-950: #042114;
  --pub-green-900: #07361f;
  --pub-green-800: #0b512c;
  --pub-green-700: #0f713a;
  --pub-green-600: #118342;
  --pub-green-100: #dcefe3;
  --pub-green-75: #edf7f0;
  --pub-green-50: #f6fbf7;
  --pub-ink: #142019;
  --pub-muted: rgba(20, 32, 25, 0.68);
  --pub-soft-border: rgba(7, 54, 31, 0.16);
  min-height: 100vh;
  background: #ffffff;
  color: var(--pub-ink);
  overflow-x: clip;
}

.pub-shell {
  width: min(1280px, calc(100% - 40px));
  margin: 0 auto;
}

.pub-topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.96);
  border-bottom: 1px solid var(--pub-soft-border);
  box-shadow: 0 1px 16px rgba(7, 54, 31, 0.08);
  backdrop-filter: blur(18px);
}

.pub-topbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 78px;
  position: relative;
}

.pub-brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--pub-green-900);
  text-decoration: none;
}

.pub-brand-logo {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  object-fit: contain;
}

.pub-brand-copy {
  display: grid;
  gap: 2px;
}

.pub-brand-copy strong {
  color: var(--pub-green-900);
  font-size: 15px;
  line-height: 1;
}

.pub-brand-copy span {
  color: rgba(20, 32, 25, 0.66);
  font-size: 12px;
  line-height: 1.4;
}

.pub-nav-wrap {
  position: relative;
  display: flex;
  justify-content: center;
  flex: 1;
  padding-bottom: 18px;
  margin-bottom: -18px;
}

.pub-nav-link {
  position: relative;
  border: 0;
  padding: 0;
  background: transparent;
  color: rgba(7, 54, 31, 0.68);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
}

.pub-nav {
  display: inline-flex;
  align-items: center;
  gap: 24px;
}

.pub-nav-link::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -16px;
  width: 100%;
  height: 2px;
  border-radius: 999px;
  background: var(--pub-green-700);
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.18s ease;
}

.pub-nav-link:hover::after,
.pub-nav-link.is-active::after {
  transform: scaleX(1);
}

.pub-nav-link.is-active,
.pub-nav-link:hover {
  color: var(--pub-green-900);
}

.pub-menu-panel {
  position: absolute;
  top: calc(100% + 18px);
  left: 50%;
  width: min(760px, calc(100vw - 80px));
  transform: translateX(-50%);
  padding: 18px;
  border: 1px solid rgba(7, 54, 31, 0.18);
  border-radius: 28px;
  background: #ffffff;
  backdrop-filter: blur(22px);
  box-shadow: 0 28px 56px rgba(7, 54, 31, 0.14);
}

.pub-menu-panel::before {
  content: "";
  position: absolute;
  top: -18px;
  left: 0;
  width: 100%;
  height: 18px;
}

.pub-menu-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: 18px;
}

.pub-menu-copy {
  padding: 14px;
}

.pub-menu-eyebrow {
  color: var(--pub-green-700);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pub-menu-title {
  margin: 16px 0 0;
  color: var(--pub-green-950);
  font-size: 28px;
  line-height: 1.02;
  letter-spacing: -0.05em;
  font-weight: 900;
}

.pub-menu-desc {
  margin: 14px 0 0;
  color: var(--pub-muted);
  font-size: 13px;
  line-height: 1.7;
}

.pub-menu-links {
  display: grid;
  gap: 10px;
}

.pub-menu-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(7, 54, 31, 0.14);
  border-radius: 22px;
  background: var(--pub-green-50);
  color: var(--pub-green-950);
  text-decoration: none;
  transition:
    transform 0.16s ease,
    border-color 0.16s ease,
    background-color 0.16s ease;
}

.pub-menu-link:hover {
  transform: translateX(4px);
  border-color: rgba(var(--mb-accent-rgb), 0.36);
  background: var(--pub-green-100);
}

.pub-menu-link-copy {
  display: grid;
  gap: 4px;
}

.pub-menu-link-copy strong {
  font-size: 17px;
  line-height: 1.1;
}

.pub-menu-link-copy span {
  color: rgba(20, 32, 25, 0.64);
  font-size: 12px;
  line-height: 1.5;
}

.pub-menu-link-arrow {
  color: var(--pub-green-700);
  font-size: 20px;
  line-height: 1;
}

.pub-menu-enter-active,
.pub-menu-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.pub-menu-enter-from,
.pub-menu-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}

.pub-topbar-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 140px;
}

.pub-search {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid var(--pub-green-700);
  background: var(--pub-green-700);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.pub-hero {
  padding: 16px 0 0;
  background:
    linear-gradient(180deg, #ffffff 0%, #ffffff 58%, #f7fbf8 100%);
}

.pub-hero-grid {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(420px, 0.95fr);
  gap: 28px;
  align-items: stretch;
  min-height: calc(100vh - 108px);
  overflow: hidden;
}

.pub-hero-lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.84;
}

.pub-hero-line {
  fill: none;
  stroke: rgba(7, 54, 31, 0.16);
  stroke-width: 1.35;
}

.pub-hero-line--accent {
  stroke: rgba(var(--mb-accent-rgb), 0.66);
  stroke-width: 1.7;
}

.pub-hero-copy {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 14px 0 28px;
  position: relative;
  z-index: 1;
}

.pub-overline {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(var(--mb-accent-rgb), 0.32);
  background: var(--pub-green-100);
  color: var(--pub-green-900);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pub-hero-title {
  max-width: 10.5ch;
  margin: 10px 0 0;
  color: var(--pub-green-950);
  font-size: clamp(34px, 4.6vw, 70px);
  line-height: 0.92;
  letter-spacing: -0.07em;
  font-weight: 900;
}

.pub-hero-desc {
  max-width: 60ch;
  margin: 10px 0 0;
  color: var(--pub-muted);
  font-size: 15px;
  line-height: 1.8;
}

.pub-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.pub-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 18px;
  border: 1px solid transparent;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  transition:
    transform 0.16s ease,
    background-color 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease;
}

.pub-btn:hover {
  transform: translateY(-1px);
}

.pub-btn--primary {
  background: linear-gradient(180deg, #13924a, var(--pub-green-700));
  border-color: var(--pub-green-700);
  color: #ffffff;
  box-shadow: 0 16px 28px rgba(7, 54, 31, 0.24);
}

.pub-btn--ghost {
  background: #ffffff;
  border-color: rgba(7, 54, 31, 0.24);
  color: var(--pub-green-900);
}

.pub-btn--outline {
  background: #ffffff;
  border-color: rgba(7, 54, 31, 0.28);
  color: var(--pub-green-900);
}

.pub-switcher {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.pub-switcher-item {
  position: relative;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(7, 54, 31, 0.14);
  border-radius: 18px;
  background: #ffffff;
  color: var(--pub-green-950);
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.22s ease,
    border-color 0.22s ease,
    background-color 0.22s ease,
    box-shadow 0.22s ease;
}

.pub-switcher-item:hover {
  transform: translateY(-2px);
}

.pub-switcher-item.is-active {
  border-color: var(--pub-green-700);
  background: var(--pub-green-900);
  color: #ffffff;
  box-shadow: 0 18px 30px rgba(7, 54, 31, 0.2);
}

.pub-switcher-index {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--pub-green-100);
  color: var(--pub-green-900);
  font-size: 15px;
  font-weight: 800;
}

.pub-switcher-text {
  display: grid;
  gap: 4px;
}

.pub-switcher-text strong {
  font-size: 14px;
  line-height: 1.1;
}

.pub-switcher-text span {
  color: rgba(20, 32, 25, 0.64);
  font-size: 12px;
  line-height: 1.5;
}

.pub-switcher-item.is-active .pub-switcher-index {
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}

.pub-switcher-item.is-active .pub-switcher-text span {
  color: rgba(255, 255, 255, 0.72);
}

.pub-stage {
  position: relative;
  min-height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0 28px;
  z-index: 1;
}

.pub-stage-photo {
  width: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition:
    transform 0.34s ease,
    filter 0.34s ease;
  filter:
    drop-shadow(0 18px 28px rgba(0, 0, 0, 0.55))
    drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.pub-stage-lane {
  position: absolute;
  width: 12px;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--stage-accent), var(--pub-green-700));
  box-shadow: 0 0 24px rgba(var(--stage-accent-rgb), 0.28);
}

.pub-stage-lane--one {
  top: 36px;
  right: 28px;
  height: 74px;
}

.pub-stage-lane--two {
  bottom: 38px;
  left: 26px;
  height: 94px;
}

.pub-stage-aura {
  position: absolute;
  inset: 20% 12% 18% 18%;
  border-radius: 50%;
  box-shadow: 0 0 130px rgba(var(--stage-accent-rgb), 0.2);
  pointer-events: none;
}

.pub-stage-frame {
  position: relative;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  width: 100%;
  min-height: 480px;
  border: 1px solid rgba(var(--stage-accent-rgb), 0.34);
  border-radius: 40px;
  background: linear-gradient(145deg, var(--stage-surface-from), var(--stage-surface-to));
  box-shadow: 0 24px 56px rgba(7, 54, 31, 0.26), 0 4px 16px rgba(0, 0, 0, 0.16);
  overflow: hidden;
}

.pub-stage-frame::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 40px;
  padding: 1.5px;
  background: conic-gradient(
    from var(--pub-border-angle),
    transparent 55%,
    rgba(var(--stage-accent-rgb), 0.5) 72%,
    rgba(var(--stage-accent-rgb), 0.85) 82%,
    rgba(var(--stage-accent-rgb), 0.5) 91%,
    transparent 100%
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  animation: pub-btn-border-spin 8s linear infinite;
}

.pub-stage-scene {
  position: absolute;
  inset: 0;
}

.pub-stage-scene-next-enter-active,
.pub-stage-scene-next-leave-active,
.pub-stage-scene-prev-enter-active,
.pub-stage-scene-prev-leave-active {
  transition:
    opacity 0.32s ease,
    transform 0.36s ease;
}

.pub-stage-scene-next-enter-from {
  opacity: 0;
  transform: translateX(40px) scale(0.97);
}

.pub-stage-scene-next-leave-to {
  opacity: 0;
  transform: translateX(-40px) scale(1.02);
}

.pub-stage-scene-prev-enter-from {
  opacity: 0;
  transform: translateX(-40px) scale(0.97);
}

.pub-stage-scene-prev-leave-to {
  opacity: 0;
  transform: translateX(40px) scale(1.02);
}

.pub-stage-poster {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.pub-stage-poster-orbit {
  stroke: rgba(var(--stage-accent-rgb), 0.32);
  stroke-width: 2;
}

.pub-stage-poster-orbit--soft {
  stroke: rgba(255, 255, 255, 0.08);
}

.pub-stage-poster-line {
  fill: none;
  stroke: rgba(var(--stage-accent-rgb), 0.3);
  stroke-width: 3;
}

.pub-stage-poster-line--soft {
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 2;
}

.pub-stage-poster-rule {
  fill: none;
  stroke: rgba(255, 255, 255, 0.16);
  stroke-width: 2;
}

.pub-stage-poster-rule--accent {
  stroke: rgba(var(--stage-accent-rgb), 0.58);
}

.pub-stage-poster-slashes rect {
  fill: rgba(var(--stage-accent-rgb), 0.82);
}

.pub-stage-poster-serial {
  fill: rgba(255, 255, 255, 0.05);
  font-size: 170px;
  font-weight: 900;
  letter-spacing: -0.08em;
}

.pub-stage-poster-brand {
  fill: var(--stage-accent-soft);
  font-size: 34px;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.pub-stage-poster-title {
  fill: white;
  font-size: 82px;
  font-weight: 900;
  letter-spacing: -0.06em;
}

.pub-stage-poster-series {
  fill: white;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.pub-stage-poster-chip rect {
  fill: rgba(6, 10, 14, 0.32);
  stroke: rgba(var(--stage-accent-rgb), 0.28);
}

.pub-stage-poster-chip-label {
  fill: rgba(255, 255, 255, 0.54);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.pub-stage-poster-chip-value {
  fill: white;
  font-size: 15px;
  font-weight: 700;
}

.pub-wheel {
  position: relative;
  width: min(480px, 74vw);
  aspect-ratio: 1;
  border-radius: 50%;
  border: 24px solid #2a3a2e;
  background: #1a2e1e;
  box-shadow:
    inset 0 0 0 6px rgba(255, 255, 255, 0.06),
    inset 0 0 0 38px #223228,
    0 26px 60px rgba(0, 0, 0, 0.18),
    0 0 40px rgba(var(--mb-accent-rgb), 0.12);
}

.pub-wheel-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transform: translate(-50%, -50%);
}

.pub-wheel-ring--outer {
  width: 74%;
  height: 74%;
}

.pub-wheel-ring--mid {
  width: 50%;
  height: 50%;
}

.pub-wheel-ring--inner {
  width: 24%;
  height: 24%;
  border-color: rgba(var(--mb-accent-rgb), 0.62);
}

.pub-wheel-spoke {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 210px;
  height: 14px;
  margin-top: -7px;
  margin-left: -105px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
}

.pub-wheel-spoke--a {
  transform: rotate(0deg);
}

.pub-wheel-spoke--b {
  transform: rotate(60deg);
}

.pub-wheel-spoke--c {
  transform: rotate(120deg);
}

.pub-wheel-core {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 66px;
  height: 66px;
  margin-top: -33px;
  margin-left: -33px;
  border-radius: 50%;
  border: 1px solid rgba(var(--mb-accent-rgb), 0.36);
  background: rgba(var(--mb-accent-rgb), 0.18);
  box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.08);
}

.pub-stage-visual {
  position: absolute;
  top: 30px;
  right: 18px;
  bottom: 24px;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: min(56%, 380px);
  padding: 0 8px;
}

.pub-stage-visual.is-kingland-tiger {
  right: 18px;
  width: min(48%, 312px);
}

.pub-stage-visual.is-irc-ss-530r {
  right: 18px;
  width: min(52%, 330px);
}

.pub-stage-visual.is-maxxis-ma-3di {
  right: 2px;
  width: min(60%, 420px);
}

.pub-stage-visual.is-zeneos-zn77 {
  right: 0;
  width: min(72%, 480px);
}

.pub-stage-visual.is-kingland-tiger .pub-stage-photo {
  transform: translateX(0) scale(0.92);
}

.pub-stage-visual.is-irc-ss-530r .pub-stage-photo {
  transform: scale(0.94);
}

.pub-stage-visual.is-maxxis-ma-3di .pub-stage-photo {
  transform: translateX(10px) rotate(-4deg) scale(0.96);
}

.pub-stage-visual.is-zeneos-zn77 .pub-stage-photo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: right center;
  transform: scale(0.9);
  transform-origin: right center;
}

.pub-tape {
  padding: 16px 0;
  background: var(--pub-green-900);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.pub-tape-track {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  width: max-content;
  animation: pub-tape-scroll 28s linear infinite;
}

.pub-tape-word {
  flex: 0 0 auto;
  white-space: nowrap;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.92);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pub-heading--light {
  color: #ffffff;
}

.pub-body {
  max-width: 62ch;
  margin: 16px 0 0;
  color: var(--pub-muted);
  font-size: 15px;
  line-height: 1.8;
}

.pub-body--light {
  color: rgba(255, 255, 255, 0.76);
}

.pub-product-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 22px;
  align-items: start;
}

.pub-product-copy {
  position: sticky;
  top: 96px;
}

.pub-product-list {
  display: grid;
  gap: 12px;
  margin-top: 24px;
}

.pub-product-item {
  position: relative;
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  width: 100%;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.22s ease,
    border-color 0.22s ease,
    background-color 0.22s ease,
    box-shadow 0.22s ease;
}

.pub-product-item:hover {
  transform: translateY(-2px);
}

.pub-product-item.is-active {
  border-color: rgba(255, 255, 255, 0.7);
  background: #ffffff;
  color: var(--pub-green-900);
  box-shadow: 0 18px 32px rgba(0, 0, 0, 0.18);
}

.pub-product-serial {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
  font-size: 18px;
  font-weight: 800;
}

.pub-product-meta {
  display: grid;
  gap: 4px;
}

.pub-product-meta strong {
  font-size: 17px;
  line-height: 1.1;
}

.pub-product-meta span {
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  line-height: 1.5;
}

.pub-product-item.is-active .pub-product-serial {
  background: var(--pub-green-700);
  color: #ffffff;
}

.pub-product-item.is-active .pub-product-meta span {
  color: rgba(20, 32, 25, 0.62);
}

.pub-product-detail {
  min-width: 0;
}

.pub-detail-panel {
  padding: 26px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 30px;
  background: #ffffff;
  color: var(--pub-green-950);
  min-height: 100%;
  box-shadow: 0 24px 54px rgba(0, 0, 0, 0.18);
}

.pub-detail-swap-enter-active,
.pub-detail-swap-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.3s ease,
    filter 0.3s ease;
}

.pub-detail-swap-enter-from {
  opacity: 0;
  transform: translateX(20px);
  filter: blur(10px);
}

.pub-detail-swap-leave-to {
  opacity: 0;
  transform: translateX(-16px);
  filter: blur(10px);
}

.pub-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.pub-detail-serial {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  min-height: 52px;
  padding: 0 12px;
  border-radius: 16px;
  background: var(--pub-green-700);
  color: white;
  font-size: 18px;
  font-weight: 900;
}

.pub-detail-fitment {
  color: rgba(20, 32, 25, 0.62);
  font-size: 13px;
  text-align: right;
}

.pub-detail-title {
  margin: 20px 0 0;
  font-size: clamp(36px, 5vw, 72px);
  line-height: 0.95;
  letter-spacing: -0.07em;
  font-weight: 900;
}

.pub-detail-desc {
  max-width: 60ch;
  margin: 16px 0 0;
  color: var(--pub-muted);
  font-size: 15px;
  line-height: 1.8;
}

.pub-detail-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 24px;
}

.pub-detail-metric {
  display: grid;
  gap: 8px;
  padding: 16px;
  border: 1px solid rgba(7, 54, 31, 0.14);
  border-radius: 18px;
  background: var(--pub-green-50);
}

.pub-detail-metric span {
  color: rgba(20, 32, 25, 0.62);
  font-size: 12px;
}

.pub-detail-metric strong {
  font-size: 18px;
  line-height: 1.1;
}

.pub-feature-list {
  display: grid;
  gap: 12px;
  margin-top: 24px;
}

.pub-feature-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid rgba(7, 54, 31, 0.14);
  background: var(--pub-green-50);
  color: rgba(20, 32, 25, 0.86);
  font-size: 14px;
  line-height: 1.7;
}

.pub-feature-dot {
  width: 10px;
  height: 10px;
  margin-top: 7px;
  border-radius: 50%;
  background: var(--pub-green-700);
  flex-shrink: 0;
}

.pub-tech-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.pub-tech-card {
  padding: 22px;
  border: 1px solid rgba(7, 54, 31, 0.14);
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(7, 54, 31, 0.08);
  transition:
    transform 0.22s ease,
    border-color 0.22s ease,
    box-shadow 0.22s ease;
}

.pub-tech-card:hover {
  transform: translateY(-3px);
  border-color: rgba(var(--mb-accent-rgb), 0.36);
  box-shadow: 0 16px 36px rgba(7, 54, 31, 0.14);
}

.pub-tech-title {
  margin: 0;
  color: var(--pub-green-950);
  font-size: 22px;
  line-height: 1.05;
  letter-spacing: -0.04em;
}

.pub-tech-desc {
  margin: 12px 0 0;
  color: var(--pub-muted);
  font-size: 14px;
  line-height: 1.7;
}

.pub-network-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 18px;
  align-items: start;
}

.pub-network-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.pub-network-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.pub-network-card {
  padding: 20px;
  border: 1px solid rgba(7, 54, 31, 0.14);
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 8px 22px rgba(7, 54, 31, 0.07);
  transition:
    transform 0.22s ease,
    border-color 0.22s ease,
    box-shadow 0.22s ease;
}

.pub-network-card:hover {
  transform: translateY(-3px);
  border-color: rgba(var(--mb-accent-rgb), 0.34);
  box-shadow: 0 16px 36px rgba(7, 54, 31, 0.12);
}

.pub-branch-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.pub-branch-area {
  margin: 10px 0 0;
  color: var(--pub-green-700);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pub-branch-link {
  color: var(--pub-green-800);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-decoration: none;
}

.pub-branch-link:hover {
  color: var(--pub-green-950);
}

.pub-network-title {
  margin: 0;
  color: var(--pub-green-950);
  font-size: 22px;
  line-height: 1.05;
  letter-spacing: -0.04em;
}

.pub-branch-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.pub-footer {
  padding: 20px 0 40px;
}

.pub-footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 22px 24px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 26px;
  background: var(--pub-green-900);
  box-shadow: 0 18px 40px rgba(7, 54, 31, 0.18);
}

.pub-footer-brand {
  color: #ffffff;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.pub-footer-copy,
.pub-copyright {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 13px;
  line-height: 1.6;
}

.pub-copyright {
  margin: 0;
  text-align: right;
}

/* ─── Missing base definitions ─── */

.pub-metrics {
  padding: 0 0 24px;
}

.pub-section {
  padding: 80px 0;
}

.pub-section--dark {
  background:
    radial-gradient(circle at 18% 12%, rgba(42, 205, 109, 0.18), transparent 32%),
    linear-gradient(135deg, var(--pub-green-950), var(--pub-green-900) 58%, var(--pub-green-800));
}

.pub-section--accent {
  border-top: 1px solid rgba(7, 54, 31, 0.12);
  background: linear-gradient(180deg, #ffffff 0%, #f7fbf8 100%);
}

.pub-section-head {
  max-width: 580px;
  margin: 0 auto 52px;
  text-align: center;
}

.pub-kicker {
  display: inline-flex;
  align-items: center;
  color: var(--pub-green-700);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.pub-kicker--dark {
  color: #7de89d;
  opacity: 1;
}

.pub-heading {
  margin: 14px 0 0;
  color: var(--pub-green-950);
  font-size: clamp(32px, 4.5vw, 58px);
  line-height: 0.96;
  letter-spacing: -0.06em;
  font-weight: 900;
}

.pub-metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  padding: 28px 0;
}

.pub-metric-card {
  padding: 28px 24px;
  border: 1px solid rgba(7, 54, 31, 0.14);
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(7, 54, 31, 0.07);
  transition:
    transform 0.22s ease,
    border-color 0.22s ease,
    box-shadow 0.22s ease;
}

.pub-metric-card:hover {
  transform: translateY(-4px);
  border-color: rgba(var(--mb-accent-rgb), 0.34);
  box-shadow: 0 18px 36px rgba(7, 54, 31, 0.14);
}

.pub-metric-value {
  color: var(--pub-green-900);
  font-size: 38px;
  font-weight: 900;
  letter-spacing: -0.05em;
  line-height: 1;
}

.pub-metric-label {
  margin: 10px 0 0;
  color: var(--pub-muted);
  font-size: 14px;
  line-height: 1.65;
}

/* ─── Animations ─── */

@keyframes pub-fade-up {
  from {
    opacity: 0;
    transform: translateY(22px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pub-line-draw {
  from { stroke-dashoffset: 1800; }
  to { stroke-dashoffset: 0; }
}

@keyframes pub-stage-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@property --pub-border-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

@keyframes pub-btn-border-spin {
  to { --pub-border-angle: 360deg; }
}

@keyframes pub-tape-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

/* Entry animations */
.pub-overline { animation: pub-fade-up 0.7s ease both; }
.pub-hero-title { animation: pub-fade-up 0.7s 0.08s ease both; }
.pub-hero-desc { animation: pub-fade-up 0.7s 0.18s ease both; }
.pub-hero-actions { animation: pub-fade-up 0.7s 0.28s ease both; }
.pub-switcher { animation: pub-fade-up 0.7s 0.38s ease both; }
.pub-stage { animation: pub-fade-up 0.8s 0.12s ease both; }

/* Hero SVG line draw */
.pub-hero-line {
  stroke-dasharray: 1800;
  animation: pub-line-draw 2.2s ease-out both;
}

.pub-hero-line--accent {
  stroke-dasharray: 1800;
  animation: pub-line-draw 2.2s 0.4s ease-out both;
}

/* Stage card float */
.pub-stage-frame {
  animation: pub-stage-float 7s ease-in-out infinite;
}

@keyframes pub-switcher-trace {
  0% { --pub-border-angle: 0deg; opacity: 1; }
  80% { opacity: 1; }
  100% { --pub-border-angle: 360deg; opacity: 0; }
}

.pub-switcher-item.is-traced::after,
.pub-product-item.is-traced::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.5px;
  background: conic-gradient(
    from var(--pub-border-angle),
    transparent 40%,
    rgba(var(--mb-accent-rgb), 0.65) 62%,
    rgba(var(--mb-accent-rgb), 1) 70%,
    rgba(var(--mb-accent-rgb), 0.65) 78%,
    transparent 95%
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  z-index: 1;
  animation: pub-switcher-trace 0.75s ease-out forwards;
}

/* Hero copy ambient glow */
.pub-hero-copy::before {
  content: "";
  position: absolute;
  top: -60px;
  left: -60px;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--mb-accent-rgb), 0.07), transparent 70%);
  pointer-events: none;
  z-index: 0;
}

@media (max-width: 1180px) {
  .pub-menu-grid {
    grid-template-columns: 1fr;
  }

  .pub-metric-grid,
  .pub-tech-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pub-product-grid,
  .pub-network-grid {
    grid-template-columns: 1fr;
  }

  .pub-product-copy {
    position: static;
  }

  .pub-network-panel {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .pub-topbar-inner,
  .pub-footer-inner {
    flex-wrap: wrap;
  }

  .pub-nav-wrap {
    order: 3;
    flex: 0 0 100%;
    justify-content: flex-start;
  }

  .pub-menu-panel {
    left: 0;
    transform: none;
    width: min(760px, 100%);
  }

  .pub-hero-grid {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .pub-hero-title {
    max-width: 11ch;
  }

  .pub-stage {
    min-height: 520px;
  }

  .pub-switcher,
  .pub-detail-metrics {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .pub-shell {
    width: min(100%, calc(100% - 20px));
  }

  .pub-brand-copy span,
  .pub-search {
    display: none;
  }

  .pub-hero {
    padding-top: 18px;
  }

  .pub-hero-title,
  .pub-heading,
  .pub-detail-title {
    max-width: none;
    font-size: 42px;
  }

  .pub-stage {
    min-height: auto;
    padding-bottom: 16px;
  }

  .pub-stage-frame {
    min-height: 360px;
    border-radius: 28px;
  }

  .pub-stage-frame::after {
    border-radius: 28px;
  }

  .pub-tape-track {
    animation-duration: 18s;
  }

  .pub-stage-frame,
  .pub-metric-card,
  .pub-tech-card,
  .pub-network-card,
  .pub-detail-panel,
  .pub-footer-inner {
    border-radius: 22px;
  }

  .pub-wheel {
    width: min(320px, 82vw);
    border-width: 18px;
    box-shadow:
      inset 0 0 0 4px rgba(255, 255, 255, 0.06),
      inset 0 0 0 24px #223228,
      0 22px 42px rgba(0, 0, 0, 0.18);
  }

  .pub-wheel-spoke {
    width: 150px;
    margin-left: -75px;
  }

  .pub-menu-panel {
    top: calc(100% + 10px);
    left: 0;
    right: 0;
    width: auto;
    transform: none;
    max-height: calc(100dvh - 160px);
    overflow-y: auto;
  }

  .pub-stage-poster-brand {
    font-size: 24px;
  }

  .pub-stage-poster-title {
    font-size: 58px;
  }

  .pub-stage-poster-series {
    font-size: 20px;
  }

  .pub-stage-poster-chip {
    display: none;
  }

  .pub-stage-visual,
  .pub-stage-visual.is-kingland-tiger,
  .pub-stage-visual.is-irc-ss-530r,
  .pub-stage-visual.is-maxxis-ma-3di,
  .pub-stage-visual.is-zeneos-zn77 {
    top: 16px;
    right: 0;
    left: 36%;
    bottom: 72px;
    width: auto;
    padding: 0;
  }

  .pub-stage-photo {
    max-height: 240px;
  }

  .pub-stage-visual.is-zeneos-zn77 .pub-stage-photo {
    height: auto;
    max-height: 240px;
    transform-origin: center bottom;
  }

  .pub-metric-grid,
  .pub-tech-grid {
    grid-template-columns: 1fr;
  }

  .pub-network-actions {
    flex-direction: column;
  }

  .pub-btn--outline,
  .pub-network-actions .pub-btn,
  .pub-hero-actions .pub-btn {
    width: 100%;
  }
}
</style>
