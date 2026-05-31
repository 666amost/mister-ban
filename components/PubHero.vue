<script setup lang="ts">
import { ref, type CSSProperties } from "vue"
import type { ProductLine, HeroMetric } from "~/types/public"

const props = defineProps<{
  productLines: ProductLine[]
  heroMetrics: HeroMetric[]
  stageLinePaths: string[]
  stageAccentPaths: string[]
  activeLine: ProductLine
  activeStageModel: string
  activeStageStyle: CSSProperties
  clickedLineId: string | null
  swipeDir: "next" | "prev"
}>()

const emit = defineEmits<{
  switchLine: [id: string]
}>()

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
  const idx = props.productLines.findIndex((l) => l.id === props.activeLine.id)
  const target =
    delta < 0
      ? props.productLines[(idx + 1) % props.productLines.length]
      : props.productLines[(idx - 1 + props.productLines.length) % props.productLines.length]
  if (target) emit("switchLine", target.id)
}
</script>

<template>
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
              @click="emit('switchLine', line.id)"
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
</template>
