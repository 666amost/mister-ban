<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { tireShowcaseSlides as slides } from "~/data/tireShowcaseData"

const showcase = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const trackIndex = ref(1)
const trackAnimated = ref(true)
const sliding = ref(false)
const dragOffset = ref(0)
const dragging = ref(false)
const touching = ref(false)
const trackSlides = [slides[slides.length - 1]!, ...slides, slides[0]!]
let gesture: { id: number; x: number; y: number; horizontal: boolean } | undefined
let slideTimer: ReturnType<typeof setTimeout> | undefined
const detailOpen = ref(false)
const entered = ref(false)
const enhanced = ref(false)
const imageReady = ref(false)
const activeIndex = ref(0)
const current = computed(() => slides[activeIndex.value]!)
const hovered = ref(false)
const keyboardFocus = ref(false)
const userPaused = ref(false)
const visible = ref(false)
const pageHidden = ref(false)
const announcement = ref("")
const loadingSlide = ref(false)
const paused = computed(() => touching.value || sliding.value || hovered.value || keyboardFocus.value || userPaused.value || detailOpen.value || !visible.value || pageHidden.value)
let mounted = false
let observer: IntersectionObserver | undefined
let pointerMedia: MediaQueryList | undefined
let motionMedia: MediaQueryList | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let frame = 0
let loadSequence = 0
const failedSlides = new Set<number>()
const imageLoads = new Map<string, Promise<boolean>>()
const SLIDE_DELAY = 6000

function resetPointer(): void {
  cancelAnimationFrame(frame)
  frame = 0
  stage.value?.style.removeProperty("--pointer-x")
  stage.value?.style.removeProperty("--pointer-y")
  stage.value?.style.removeProperty("--pointer-turn")
}
function movePointer(event: PointerEvent): void {
  if (gesture || event.pointerType !== "mouse" || !pointerMedia?.matches || motionMedia?.matches || detailOpen.value || !stage.value) return
  const bounds = stage.value.getBoundingClientRect()
  const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - .5) * 2))
  const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - .5) * 2))
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    stage.value?.style.setProperty("--pointer-x", `${x * 8}px`)
    stage.value?.style.setProperty("--pointer-y", `${y * 5}px`)
    stage.value?.style.setProperty("--pointer-turn", `${x * 2}deg`)
    frame = 0
  })
}
function stopTimer(): void { clearTimeout(timer); timer = undefined }
function scheduleNext(): void {
  stopTimer()
  if (!mounted || paused.value || loadingSlide.value || !imageReady.value || failedSlides.size >= slides.length - 1) return
  timer = setTimeout(() => { void changeSlide(1) }, SLIDE_DELAY)
}
function preloadImage(src: string): Promise<boolean> {
  const cached = imageLoads.get(src)
  if (cached) return cached
  const loaded = new Promise<boolean>(resolve => {
    const img = new Image()
    img.onload = () => resolve(img.naturalWidth > 0)
    img.onerror = () => resolve(false)
    img.src = src
  })
  imageLoads.set(src, loaded)
  return loaded
}
async function changeSlide(direction: number, manual = false): Promise<void> {
  if (loadingSlide.value || sliding.value || (!manual && paused.value)) return
  stopTimer()
  let next = activeIndex.value
  for (let i = 0; i < slides.length; i++) {
    next = (next + direction + slides.length) % slides.length
    if (!failedSlides.has(next)) break
  }
  if (next === activeIndex.value) return
  const sequence = ++loadSequence
  loadingSlide.value = true
  const loaded = await preloadImage(slides[next]!.image)
  if (!mounted || sequence !== loadSequence) return
  loadingSlide.value = false
  // Never replace the visible photo with an unloaded image or move under a new hover.
  if (!loaded) {
    failedSlides.add(next)
    if (manual) announcement.value = "Foto belum dapat dimuat. Silakan coba ban lainnya."
  } else if (manual || !paused.value) {
    resetPointer()
    trackAnimated.value = !motionMedia?.matches
    sliding.value = true
    trackIndex.value = next === 0 && direction > 0 ? slides.length + 1 : next === slides.length - 1 && direction < 0 ? 0 : next + 1
    activeIndex.value = next
    // A timeout also settles transitions when the tab is hidden or motion is disabled.
    slideTimer = setTimeout(settleSlide, motionMedia?.matches ? 0 : 650)
    if (manual) announcement.value = `${current.value.brand} ${current.value.model}, foto ${next + 1} dari ${slides.length}.`
  }
  scheduleNext()
}
function imageLoaded(index: number): void {
  if (index === activeIndex.value + 1) { imageReady.value = true; scheduleNext() }
}
function settleSlide(): void {
  clearTimeout(slideTimer)
  trackAnimated.value = false
  trackIndex.value = activeIndex.value + 1
  sliding.value = false
  scheduleNext()
}
function startGesture(event: PointerEvent): void {
  if (event.button !== 0 || !event.isPrimary || sliding.value || loadingSlide.value || (event.target as HTMLElement).closest('button, a, .tire-detail')) return
  gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false }
  touching.value = true
  resetPointer()
}
function moveGesture(event: PointerEvent): void {
  if (!gesture || gesture.id !== event.pointerId) { movePointer(event); return }
  const dx = event.clientX - gesture.x
  const dy = event.clientY - gesture.y
  if (!gesture.horizontal) {
    if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { cancelGesture(); return }
    if (Math.abs(dx) < 8) return
    gesture.horizontal = true
    stage.value?.setPointerCapture(event.pointerId)
    dragging.value = true
  }
  dragOffset.value = Math.max(-(stage.value?.clientWidth ?? 400), Math.min(stage.value?.clientWidth ?? 400, dx))
}
function endGesture(event: PointerEvent): void {
  if (!gesture || gesture.id !== event.pointerId) return
  const distance = dragOffset.value
  const shouldChange = gesture.horizontal && Math.abs(distance) > Math.max(40, (stage.value?.clientWidth ?? 400) * .15)
  cancelGesture()
  trackAnimated.value = true
  if (shouldChange) void changeSlide(distance < 0 ? 1 : -1, true)
}
function cancelGesture(): void {
  const id = gesture?.id
  gesture = undefined
  if (id !== undefined && stage.value?.hasPointerCapture(id)) stage.value.releasePointerCapture(id)
  dragging.value = false
  touching.value = false
  dragOffset.value = 0
}
function toggleDetail(): void { resetPointer(); detailOpen.value = !detailOpen.value }
function leavePointer(): void { hovered.value = false; resetPointer() }
function focusIn(event: FocusEvent): void {
  keyboardFocus.value = (event.target as HTMLElement).matches(":focus-visible")
}
function focusOut(event: FocusEvent): void {
  if (!showcase.value?.contains(event.relatedTarget as Node | null)) keyboardFocus.value = false
}
function keyboardNavigate(event: KeyboardEvent): void {
  if (event.altKey || event.ctrlKey || event.metaKey || !["ArrowLeft", "ArrowRight"].includes(event.key)) return
  event.preventDefault()
  keyboardFocus.value = true
  void changeSlide(event.key === "ArrowRight" ? 1 : -1, true)
}
function motionChanged(): void {
  resetPointer()
  if (motionMedia?.matches) userPaused.value = true
}
function visibilityChanged(): void { pageHidden.value = document.hidden }
watch([paused, imageReady], scheduleNext)

onMounted(() => {
  mounted = true
  pointerMedia = window.matchMedia("(hover: hover) and (pointer: fine)")
  motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)")
  motionMedia.addEventListener("change", motionChanged)
  userPaused.value = motionMedia.matches
  enhanced.value = !motionMedia.matches
  pageHidden.value = document.hidden
  document.addEventListener("visibilitychange", visibilityChanged)
  const initialPhoto = stage.value?.querySelector<HTMLImageElement>('[data-slide="1"] img')
  imageReady.value = !!initialPhoto?.complete && initialPhoto.naturalWidth > 0
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(([entry]) => {
      visible.value = !!entry?.isIntersecting && entry.intersectionRatio >= .2
      if (visible.value) entered.value = true
    }, { threshold: .2 })
    if (showcase.value) observer.observe(showcase.value)
  } else {
    visible.value = true
    entered.value = true
  }
  scheduleNext()
})
onBeforeUnmount(() => {
  mounted = false
  loadSequence++
  clearTimeout(slideTimer)
  cancelGesture()
  stopTimer()
  observer?.disconnect()
  motionMedia?.removeEventListener("change", motionChanged)
  document.removeEventListener("visibilitychange", visibilityChanged)
  resetPointer()
})
</script>

<template>
  <figure ref="showcase" class="tire-showcase" role="region" aria-roledescription="karusel" aria-label="Pilihan ban motor" :class="{ 'has-motion': enhanced, 'has-entered': entered && imageReady, 'is-detail': detailOpen }" :style="{ '--brand-accent': current.accent, '--detail-width': current.cropWidth, '--detail-left': current.cropLeft, '--detail-top': current.cropTop }" @pointerenter="event => { if (event.pointerType === 'mouse') hovered = true }" @pointerleave="leavePointer" @pointerdown="keyboardFocus = false" @focusin="focusIn" @focusout="focusOut" @keydown="keyboardNavigate">
    <div class="tire-showcase__heading"><span>{{ current.heading }}</span><span>Ban motor</span></div>
    <div ref="stage" class="tire-stage" :class="{ 'is-dragging': dragging }" @pointerdown="startGesture" @pointermove="moveGesture" @pointerup="endGesture" @pointerleave="resetPointer" @pointercancel="cancelGesture" @lostpointercapture.self="cancelGesture">
      <span class="tire-stage__type" :class="{ 'is-long': current.mark.length > 3 }" aria-hidden="true">{{ current.mark }}</span>
      <div class="tire-stage__ring tire-stage__ring--back" aria-hidden="true" />
      <div class="tire-stage__ring tire-stage__ring--front" aria-hidden="true" />
      <span class="tire-stage__axis" aria-hidden="true" />
      <div class="tire-stage__pointer">
        <div class="tire-stage__entrance">
          <div class="tire-slider" :class="{ 'is-animated': trackAnimated && !dragging }" :style="{ transform: `translate3d(calc(${-trackIndex * 100}% + ${dragOffset}px), 0, 0)` }" @transitionend.self="settleSlide">
            <div v-for="(slide, index) in trackSlides" :key="index" class="tire-slider__slide" :data-slide="index" :aria-hidden="index !== activeIndex + 1">
              <img class="tire-stage__image" :class="`tire-stage__image--${slide.id}`" :src="slide.image" :alt="`Foto ban ${slide.brand} ${slide.model}, tampak tapak dan sisi ban`" width="800" height="800" :fetchpriority="index === 1 ? 'high' : 'low'" :draggable="false" @load="imageLoaded(index)" />
            </div>
          </div>
        </div>
      </div>
      <span class="tire-stage__profile" :aria-hidden="detailOpen">Profil ban <span aria-hidden="true">&#8599;</span></span>
      <div id="tire-tread-detail" class="tire-detail" :aria-hidden="!detailOpen" :inert="!detailOpen">
        <span class="tire-detail__leader" aria-hidden="true" />
        <div class="tire-detail__crop"><img :src="current.image" :alt="`Pembesaran alur tapak dari foto ban ${current.brand} ${current.model}`" width="800" height="800" /></div>
        <strong>Alur tapak</strong><span>Foto diperbesar</span>
      </div>
      <div class="tire-showcase__arrows" aria-label="Ganti foto ban">
        <button type="button" aria-label="Ban sebelumnya" :disabled="loadingSlide || sliding" @click="changeSlide(-1, true)">&#8592;</button>
        <button type="button" aria-label="Ban berikutnya" :disabled="loadingSlide || sliding" @click="changeSlide(1, true)">&#8594;</button>
      </div>
    </div>
    <div class="tire-showcase__playback">
      <span class="tire-showcase__count" aria-hidden="true">{{ String(activeIndex + 1).padStart(2, '0') }} <span>/ {{ String(slides.length).padStart(2, '0') }}</span></span>
      <div class="tire-showcase__dots" aria-hidden="true"><span v-for="(slide, index) in slides" :key="slide.id" :class="{ 'is-current': index === activeIndex }" /></div>
      <button type="button" class="tire-showcase__pause" :aria-label="userPaused ? 'Putar slideshow otomatis' : 'Jeda slideshow otomatis'" :aria-pressed="userPaused" @click="userPaused = !userPaused">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path v-if="userPaused" d="m5 3 7 5-7 5Z" /><path v-else d="M5 3v10M11 3v10" /></svg><span>{{ userPaused ? 'Putar' : 'Jeda' }}</span>
      </button>
    </div>
    <figcaption class="tire-showcase__caption">
      <div><strong>{{ current.brand }}</strong><span>{{ current.model }}</span></div>
      <button type="button" class="tire-detail-toggle" :aria-pressed="detailOpen" aria-controls="tire-tread-detail" @click="toggleDetail"><span class="tire-detail-toggle__icon" aria-hidden="true" />{{ detailOpen ? 'Tutup detail' : 'Detail tapak' }}</button>
    </figcaption>
    <p class="tire-showcase__announcement" role="status" aria-live="polite" aria-atomic="true">{{ announcement }}</p>
    <NuxtLink to="/merek" class="tire-showcase__link">Lihat pilihan merek <span aria-hidden="true">&#8594;</span></NuxtLink>
  </figure>
</template>

<style scoped>
.tire-showcase {
  --motion-ease: cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
  min-width: 0;
  margin: 0;
  padding: 22px 26px 0;
  border-radius: 4px;
  background: #eeeee4;
  color: #29412e;
}
.tire-showcase__heading { display: flex; justify-content: space-between; gap: 16px; font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.tire-showcase__heading > span:last-child { color: #63715d; font-weight: 500; }
.tire-stage { position: relative; height: 365px; margin: 14px -10px 4px; overflow: hidden; isolation: isolate; }
.tire-stage__type { position: absolute; right: 4px; top: -10px; color: #dce1d1; font-size: 150px; font-weight: 900; font-style: italic; line-height: 1; letter-spacing: -0.09em; user-select: none; }
.tire-stage__ring { position: absolute; top: 30px; left: calc(50% - 116px); width: 232px; height: 300px; border: 1px solid #bbc6ad; border-radius: 50%; transform: rotate(-18deg); transition: transform 700ms var(--motion-ease), opacity 500ms ease; }
.tire-stage__ring--front { top: 48px; left: calc(50% - 100px); width: 200px; height: 264px; border-style: dashed; opacity: 0.55; }
.tire-stage__axis { position: absolute; top: 50%; left: 12px; right: 12px; border-top: 1px solid #cbd2c0; transform: rotate(-18deg); opacity: 0.6; }
.tire-stage__pointer { mix-blend-mode: multiply; position: absolute; inset: 0; transform: translate(var(--pointer-x, 0px), var(--pointer-y, 0px)) rotate(var(--pointer-turn, 0deg)); transition: transform 450ms var(--motion-ease); }
.tire-stage__entrance { position: relative; width: 100%; height: 100%; }
.tire-stage__image { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: contain; transform: rotate(-12deg) scale(1.04); transition: transform 750ms var(--motion-ease); }
.tire-stage__profile { position: absolute; bottom: 8px; left: 6px; display: flex; gap: 16px; color: #5d6c54; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; transition: opacity 200ms ease; }
.tire-detail { position: absolute; z-index: 2; top: 112px; right: 4px; width: 120px; opacity: 0; visibility: hidden; transform: translateX(24px); transition: opacity 400ms ease, transform 650ms var(--motion-ease), visibility 650ms; }
.tire-detail__crop { position: relative; height: 152px; overflow: hidden; border: 3px solid #fafbf4; background: #dce2d2; }
.tire-detail__crop img { position: absolute; width: var(--detail-width, 420px); height: auto; max-width: none; left: var(--detail-left, -119px); top: var(--detail-top, -108px); mix-blend-mode: multiply; }
.tire-detail__leader { position: absolute; width: 52px; left: -52px; top: 50px; border-top: 1px solid #60764f; transform: rotate(-20deg); transform-origin: right; }
.tire-detail__leader::before { content: ""; position: absolute; width: 5px; height: 5px; top: -3px; left: 0; border-radius: 50%; background: #60764f; }
.tire-detail strong { display: block; margin-top: 10px; font-size: 10px; letter-spacing: 0.04em; text-transform: uppercase; }
.tire-detail > span:last-child { display: block; margin-top: 3px; color: #64715e; font-size: 9px; }
.is-detail .tire-stage__image { transform: translateX(-17%) rotate(-5deg) scale(1); }
.is-detail .tire-stage__ring--back { transform: translateX(-36px) rotate(-28deg); opacity: 0.5; }
.is-detail .tire-stage__ring--front { transform: translateX(22px) rotate(-8deg); opacity: 0.4; }
.is-detail .tire-stage__profile { opacity: 0; }
.is-detail .tire-detail { opacity: 1; visibility: visible; transform: none; }
.tire-showcase__caption { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding-block: 18px; border-top: 1px solid #cad2be; }
.tire-showcase__caption > div { display: grid; gap: 5px; }
.tire-showcase__caption strong { text-transform: uppercase; font-size: 28px; line-height: 1; font-weight: 900; font-style: italic; letter-spacing: -0.055em; color: var(--brand-accent, #b4471c); }
.tire-showcase__caption > div > span { color: #52614b; font-size: 11px; }
.tire-detail-toggle { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 10px; border: 1px solid #b6c3a7; border-radius: 3px; background: transparent; color: #29412e; font-size: 11px; font-weight: 700; cursor: pointer; }
.tire-detail-toggle:hover, .tire-detail-toggle[aria-pressed="true"] { background: #dfe8ce; }
.tire-detail-toggle__icon { position: relative; width: 12px; height: 12px; transition: transform 350ms var(--motion-ease); }
.tire-detail-toggle__icon::before, .tire-detail-toggle__icon::after { content: ""; position: absolute; top: 5px; left: 0; width: 12px; height: 1px; background: currentColor; }
.tire-detail-toggle__icon::after { transform: rotate(90deg); }
.is-detail .tire-detail-toggle__icon { transform: rotate(45deg); }
.tire-showcase__link { display: flex; min-height: 44px; justify-content: space-between; align-items: center; gap: 18px; border-top: 1px solid #cad2be; color: #52614b; font-size: 11px; text-decoration: none; }
.tire-showcase__link:hover { color: #133c25; }
.tire-showcase__link > span { transition: transform 250ms ease; }
.tire-showcase__link:hover > span { transform: translateX(4px); }

/* Animation starts once, after the photo is loaded and the stage enters the viewport. */
.has-motion:not(.has-entered) .tire-stage__entrance { opacity: 1; }
.has-motion.has-entered .tire-stage__entrance { animation: tire-arrive 950ms var(--motion-ease) both; }
.has-motion.has-entered .tire-stage__ring--back { animation: ring-arrive 1100ms var(--motion-ease) backwards; }
@keyframes tire-arrive {
  from { opacity: 0; transform: translate(65px, 14px) rotate(22deg) scale(0.92); }
  to { opacity: 1; transform: none; }
}
@keyframes ring-arrive {
  from { opacity: 0; scale: 0.84; }
  to { opacity: 1; scale: 1; }
}
@media (max-width: 1000px) {
  .tire-showcase { padding-inline: 18px; }
  .tire-stage { height: 330px; }
  .tire-detail { width: 100px; }
  .tire-detail__crop { height: 132px; }
  .tire-stage__ring { height: 270px; width: 210px; left: calc(50% - 105px); }
}
@media (max-width: 760px) {
  .tire-showcase { max-width: 540px; width: 100%; }
  .tire-stage { height: 320px; }
  .tire-stage__type { font-size: 130px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .has-motion:not(.has-entered) .tire-stage__entrance { opacity: 1; }
  .tire-stage__pointer { transform: none; }
}

.tire-stage__type.is-long { top: 24px; font-size: 88px; letter-spacing: -.065em; }
.tire-stage__image--zeneos { transform: rotate(-8deg) scale(1.18); mask-image: radial-gradient(ellipse 56% 58% at 50% 47%, #000 65%, transparent 94%); }
.tire-stage { touch-action: pan-y pinch-zoom; cursor: grab; user-select: none; }
.tire-stage.is-dragging { cursor: grabbing; }
.tire-slider { display: flex; width: 100%; height: 100%; will-change: transform; }
.tire-slider.is-animated { transition: transform 580ms cubic-bezier(.22,.7,.22,1); }
.tire-slider__slide { overflow: hidden; position: relative; flex: 0 0 100%; min-width: 0; height: 100%; }
.tire-stage__image { pointer-events: none; }
.tire-stage.is-dragging .tire-stage__pointer { transform: none; transition: none; }
.tire-showcase__arrows { position: absolute; inset: 0; z-index: 3; display: flex; align-items: center; justify-content: space-between; padding-inline: 2px; pointer-events: none; opacity: 0; transition: opacity 200ms ease; }
.is-detail .tire-showcase__arrows { align-items: flex-end; padding-bottom: 8px; }
.tire-showcase__arrows button { display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid #b7c3ad; border-radius: 50%; background: #f7f8eeeb; color: #29412e; font-size: 20px; cursor: pointer; pointer-events: none; }
.tire-showcase:hover .tire-showcase__arrows, .tire-showcase:has(:focus-visible) .tire-showcase__arrows { opacity: 1; }
.tire-showcase:hover .tire-showcase__arrows button, .tire-showcase:has(:focus-visible) .tire-showcase__arrows button { pointer-events: auto; }
.tire-showcase__arrows button:hover { background: #dfe8ce; border-color: #7c946b; }
.tire-showcase__arrows button:disabled { cursor: wait; }
.tire-showcase__playback { display: flex; align-items: center; gap: 12px; min-height: 40px; margin-top: 2px; }
.tire-showcase__count { font-size: 10px; font-weight: 700; font-variant-numeric: tabular-nums; }
.tire-showcase__count > span { margin-left: 4px; color: #7b8770; font-weight: 400; }
.tire-showcase__dots { display: flex; gap: 5px; }
.tire-showcase__dots > span { width: 12px; height: 2px; background: #c9d1bd; transition: background 200ms ease; }
.tire-showcase__dots > .is-current { background: #3c623b; }
.tire-showcase__pause { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; margin-left: auto; padding: 4px 0 4px 8px; color: #5e7053; background: none; border: 0; font-size: 10px; cursor: pointer; }
.tire-showcase__pause svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linejoin: round; }
.tire-showcase__pause:hover { color: #234829; }
.tire-showcase__announcement { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (hover: none), (pointer: coarse) {
  .tire-showcase__arrows { opacity: 1; }
  .tire-showcase__arrows button { pointer-events: auto; }
}
@media (max-width: 760px) { .tire-stage__type.is-long { font-size: 70px; } }
@media (prefers-reduced-motion: reduce) { .tire-slider.is-animated { transition: none; } }
</style>
