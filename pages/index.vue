<script setup lang="ts">
import { useSeoMeta } from "#imports"
import { computed, onBeforeUnmount, ref, type CSSProperties } from "vue"
import type { PublicBranchCard, ProductLine } from "~/types/public"
import { navGroups, tapeWords, stageLinePaths, stageAccentPaths, heroMetrics, techCards, branchFallbacks, productLines, brandCatalog } from "~/data/pubHomeData"

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

const defaultProductLine = productLines.at(0)

if (!defaultProductLine) {
  throw new Error("Expected at least one public product line")
}

const activeLineId = ref<string>(defaultProductLine.id)
const activeBrandId = ref<string>(defaultProductLine.id)
const clickedLineId = ref<string | null>(null)
let traceTimer: ReturnType<typeof setTimeout> | null = null
const swipeDir = ref<"next" | "prev">("next")

function handleSwitcherClick(id: string): void {
  const currentIdx = productLines.findIndex((l) => l.id === activeLineId.value)
  const targetIdx = productLines.findIndex((l) => l.id === id)
  swipeDir.value = targetIdx >= currentIdx ? "next" : "prev"
  activeLineId.value = id
  activeBrandId.value = id
  clickedLineId.value = id
  if (traceTimer) clearTimeout(traceTimer)
  traceTimer = setTimeout(() => { clickedLineId.value = null }, 750)
}

function handleBrandSwitch(id: string): void {
  activeBrandId.value = id
}

const activeLine = computed<ProductLine>(() => {
  return productLines.find((line) => line.id === activeLineId.value) ?? defaultProductLine
})

const activeStageModel = computed<string>(() => {
  return activeLine.value.name.replace(new RegExp(`^${activeLine.value.brand}\\s*`, "i"), "").toUpperCase()
})

const activeStageStyle = computed<CSSProperties>(() => ({
  "--stage-accent": activeLine.value.stagePalette.accent,
  "--stage-accent-rgb": activeLine.value.stagePalette.accentRgb,
  "--stage-accent-soft": activeLine.value.stagePalette.accentSoft,
  "--stage-surface-from": activeLine.value.stagePalette.surfaceFrom,
  "--stage-surface-to": activeLine.value.stagePalette.surfaceTo,
  "--stage-surface-glow": activeLine.value.stagePalette.surfaceGlow,
}))

const publicBranches = computed<PublicBranchCard[]>(() =>
  branchFallbacks.map((b) => ({ title: b.title, area: b.area, instagram: b.instagram }))
)

const currentYear: number = new Date().getFullYear()

onBeforeUnmount(() => {
  if (traceTimer) clearTimeout(traceTimer)
})
</script>

<template>
  <main class="pub-page">
    <PubTopbar :nav-groups="navGroups" />
    <PubHero
      :product-lines="productLines"
      :hero-metrics="heroMetrics"
      :stage-line-paths="stageLinePaths"
      :stage-accent-paths="stageAccentPaths"
      :active-line="activeLine"
      :active-stage-model="activeStageModel"
      :active-stage-style="activeStageStyle"
      :clicked-line-id="clickedLineId"
      :swipe-dir="swipeDir"
      @switch-line="handleSwitcherClick"
    />
    <PubTape :words="tapeWords" />
    <PubMetrics :metrics="heroMetrics" />
    <PubSizeFinder :brand-catalog="brandCatalog" />
    <PubProducts
      :brand-catalog="brandCatalog"
      :active-brand-id="activeBrandId"
      @switch-brand="handleBrandSwitch"
    />
    <PubServices :tech-cards="techCards" />
    <PubBranches :branches="publicBranches" />
    <PubFooter :current-year="currentYear" />
  </main>
</template>

<style>
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
  position: relative;
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

.pub-btn::after {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: 18px;
  padding: 2px;
  background: conic-gradient(
    from var(--pub-border-angle),
    transparent 55%,
    rgba(35, 210, 110, 0.55) 70%,
    rgba(35, 210, 110, 0.95) 82%,
    rgba(35, 210, 110, 0.55) 93%,
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
  opacity: 0;
  transition: opacity 0.25s ease;
  animation: pub-btn-border-spin 2.5s linear infinite;
}

.pub-btn:hover::after,
.pub-btn:focus-visible::after {
  opacity: 1;
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
  padding: 2px;
  background: conic-gradient(
    from var(--pub-border-angle),
    transparent 50%,
    rgba(var(--stage-accent-rgb), 0.7) 68%,
    rgba(var(--stage-accent-rgb), 1) 80%,
    rgba(var(--stage-accent-rgb), 0.7) 90%,
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

.pub-wheel-ring--outer { width: 74%; height: 74%; }
.pub-wheel-ring--mid { width: 50%; height: 50%; }

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

.pub-wheel-spoke--a { transform: rotate(0deg); }
.pub-wheel-spoke--b { transform: rotate(60deg); }
.pub-wheel-spoke--c { transform: rotate(120deg); }

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

.pub-stage-visual.is-kingland-tiger { right: 18px; width: min(48%, 312px); }
.pub-stage-visual.is-irc-ss-530r { right: 18px; width: min(52%, 330px); }
.pub-stage-visual.is-maxxis-ma-3di { right: 2px; width: min(60%, 420px); }
.pub-stage-visual.is-zeneos-zn77 { right: 0; width: min(72%, 480px); }

.pub-stage-visual.is-kingland-tiger .pub-stage-photo { transform: translateX(0) scale(0.92); }
.pub-stage-visual.is-irc-ss-530r .pub-stage-photo { transform: scale(0.94); }
.pub-stage-visual.is-maxxis-ma-3di .pub-stage-photo { transform: translateX(10px) rotate(-4deg) scale(0.96); }

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

.pub-body {
  max-width: 62ch;
  margin: 16px 0 0;
  color: var(--pub-muted);
  font-size: 15px;
  line-height: 1.8;
}

.pub-body--light { color: rgba(255, 255, 255, 0.76); }
.pub-heading--light { color: #ffffff; }



.pub-detail-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; }

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

.pub-detail-fitment { color: rgba(20, 32, 25, 0.62); font-size: 13px; text-align: right; }

.pub-detail-title {
  margin: 20px 0 0;
  font-size: clamp(36px, 5vw, 72px);
  line-height: 0.95;
  letter-spacing: -0.07em;
  font-weight: 900;
}

.pub-detail-desc { max-width: 60ch; margin: 16px 0 0; color: var(--pub-muted); font-size: 15px; line-height: 1.8; }

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

.pub-detail-metric span { color: rgba(20, 32, 25, 0.62); font-size: 12px; }
.pub-detail-metric strong { font-size: 18px; line-height: 1.1; }

.pub-feature-list { display: grid; gap: 12px; margin-top: 24px; }

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

.pub-tech-title { margin: 0; color: var(--pub-green-950); font-size: 22px; line-height: 1.05; letter-spacing: -0.04em; }
.pub-tech-desc { margin: 12px 0 0; color: var(--pub-muted); font-size: 14px; line-height: 1.7; }

.pub-network-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 18px;
  align-items: start;
}

.pub-network-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }

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

.pub-branch-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }

.pub-branch-area {
  margin: 10px 0 0;
  color: var(--pub-green-700);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pub-branch-link { color: var(--pub-green-800); font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-decoration: none; }
.pub-branch-link:hover { color: var(--pub-green-950); }
.pub-network-title { margin: 0; color: var(--pub-green-950); font-size: 22px; line-height: 1.05; letter-spacing: -0.04em; }
.pub-branch-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }

.pub-footer { padding: 20px 0 40px; }

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

.pub-footer-brand { color: #ffffff; font-size: 18px; font-weight: 800; letter-spacing: -0.04em; }

.pub-footer-copy,
.pub-copyright {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 13px;
  line-height: 1.6;
}

.pub-copyright { margin: 0; text-align: right; }

.pub-metrics { padding: 0 0 24px; }

.pub-section { padding: 80px 0; }

.pub-section--dark {
  background:
    radial-gradient(circle at 18% 12%, rgba(42, 205, 109, 0.18), transparent 32%),
    linear-gradient(135deg, var(--pub-green-950), var(--pub-green-900) 58%, var(--pub-green-800));
}

.pub-section--accent {
  border-top: 1px solid rgba(7, 54, 31, 0.12);
  background: linear-gradient(180deg, #ffffff 0%, #f7fbf8 100%);
}

.pub-section-head { max-width: 580px; margin: 0 auto 52px; text-align: center; }

.pub-kicker {
  display: inline-flex;
  align-items: center;
  color: var(--pub-green-700);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.pub-kicker--dark { color: #7de89d; opacity: 1; }

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

.pub-metric-value { color: var(--pub-green-900); font-size: 38px; font-weight: 900; letter-spacing: -0.05em; line-height: 1; }
.pub-metric-label { margin: 10px 0 0; color: var(--pub-muted); font-size: 14px; line-height: 1.65; }

@keyframes pub-fade-up {
  from { opacity: 0; transform: translateY(22px); }
  to { opacity: 1; transform: translateY(0); }
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

.pub-overline { animation: pub-fade-up 0.7s ease both; }
.pub-hero-title { animation: pub-fade-up 0.7s 0.08s ease both; }
.pub-hero-desc { animation: pub-fade-up 0.7s 0.18s ease both; }
.pub-hero-actions { animation: pub-fade-up 0.7s 0.28s ease both; }
.pub-switcher { animation: pub-fade-up 0.7s 0.38s ease both; }
.pub-stage { animation: pub-fade-up 0.8s 0.12s ease both; }

.pub-hero-line { stroke-dasharray: 1800; animation: pub-line-draw 2.2s ease-out both; }
.pub-hero-line--accent { stroke-dasharray: 1800; animation: pub-line-draw 2.2s 0.4s ease-out both; }
.pub-stage-frame { animation: pub-stage-float 7s ease-in-out infinite; }

@keyframes pub-switcher-trace {
  0% { --pub-border-angle: 0deg; opacity: 1; }
  80% { opacity: 1; }
  100% { --pub-border-angle: 360deg; opacity: 0; }
}

.pub-switcher-item.is-traced::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 2px;
  background: conic-gradient(
    from var(--pub-border-angle),
    transparent 35%,
    rgba(35, 210, 110, 0.7) 58%,
    rgba(35, 210, 110, 1) 68%,
    rgba(35, 210, 110, 0.7) 78%,
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
  animation: pub-switcher-trace 1s ease-out forwards;
}

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
  .pub-menu-grid { grid-template-columns: 1fr; }
  .pub-metric-grid, .pub-tech-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pub-network-grid { grid-template-columns: 1fr; }
  .pub-network-panel { grid-template-columns: 1fr; }
}

@media (max-width: 960px) {
  .pub-topbar-inner, .pub-footer-inner { flex-wrap: wrap; }
  .pub-nav-wrap { order: 3; flex: 0 0 100%; justify-content: flex-start; }
  .pub-menu-panel { left: 0; transform: none; width: min(760px, 100%); }
  .pub-hero-grid { grid-template-columns: 1fr; min-height: auto; }
  .pub-hero-title { max-width: 11ch; }
  .pub-stage { min-height: 520px; }
  .pub-switcher, .pub-detail-metrics { grid-template-columns: 1fr; }
}

@media (max-width: 720px) {
  .pub-shell { width: min(100%, calc(100% - 20px)); }
  .pub-brand-copy span, .pub-search { display: none; }
  .pub-hero { padding-top: 18px; }
  .pub-hero-title, .pub-heading, .pub-detail-title { max-width: none; font-size: 42px; }
  .pub-stage { min-height: auto; padding-bottom: 16px; }
  .pub-stage-frame { min-height: 360px; border-radius: 28px; }
  .pub-stage-frame::after { border-radius: 28px; }
  .pub-tape-track { animation-duration: 18s; }
  .pub-stage-frame, .pub-metric-card, .pub-tech-card, .pub-network-card, .pub-footer-inner { border-radius: 22px; }
  .pub-wheel { width: min(320px, 82vw); border-width: 18px; box-shadow: inset 0 0 0 4px rgba(255, 255, 255, 0.06), inset 0 0 0 24px #223228, 0 22px 42px rgba(0, 0, 0, 0.18); }
  .pub-wheel-spoke { width: 150px; margin-left: -75px; }
  .pub-menu-panel { top: calc(100% + 10px); left: 0; right: 0; width: auto; transform: none; max-height: calc(100dvh - 160px); overflow-y: auto; }
  .pub-stage-poster-brand { font-size: 24px; }
  .pub-stage-poster-title { font-size: 58px; }
  .pub-stage-poster-series { font-size: 20px; }
  .pub-stage-poster-chip { display: none; }
  .pub-stage-visual, .pub-stage-visual.is-kingland-tiger, .pub-stage-visual.is-irc-ss-530r, .pub-stage-visual.is-maxxis-ma-3di, .pub-stage-visual.is-zeneos-zn77 { top: 16px; right: 0; left: 36%; bottom: 72px; width: auto; padding: 0; }
  .pub-stage-photo { max-height: 240px; }
  .pub-stage-visual.is-zeneos-zn77 .pub-stage-photo { height: auto; max-height: 240px; transform-origin: center bottom; }
  .pub-metric-grid, .pub-tech-grid { grid-template-columns: 1fr; }
  .pub-network-actions { flex-direction: column; }
  .pub-btn--outline, .pub-network-actions .pub-btn, .pub-hero-actions .pub-btn { width: 100%; }
}
</style>
