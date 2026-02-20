<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue"

const me = useMe()
const storeContext = useStoreContext()
const route = useRoute()

const role = computed(() => me.user.value?.role ?? null)
const storeName = computed(() => storeContext.store.value?.name ?? null)

const sidebarOpen = ref(false)
const isNavigating = ref(false)
const moreMenuOpen = ref(false)

type IconName =
  | "home"
  | "sales"
  | "inventory"
  | "products"
  | "suppliers"
  | "reports"
  | "users"

type NavItem = {
  to: string
  label: string
  icon: IconName
  keywords?: string[]
}

type NavGroup = {
  label: string
  items: NavItem[]
  adminOnly?: boolean
}

type BottomItem = {
  key: string
  label: string
  icon: IconName
  to?: string
  kind: "link" | "menu"
}

type ThemeMode = "system" | "dark" | "light"

const navGroups = computed<NavGroup[]>(() => {
  const groups: NavGroup[] = [
    {
      label: "Menu",
      items: [
        { to: "/", label: "Dashboard", icon: "home", keywords: ["home"] },
        { to: "/sales", label: "Sales", icon: "sales", keywords: ["struk", "invoice", "kasir"] },
      ],
    },
  ]

  if (role.value === "ADMIN") {
    groups[0]?.items.push({ to: "/inventory", label: "Inventory", icon: "inventory", keywords: ["stock", "stok"] })
    groups.push(
      {
        label: "Master",
        adminOnly: true,
        items: [
          { to: "/products", label: "Products", icon: "products", keywords: ["produk", "master"] },
          { to: "/suppliers", label: "Suppliers", icon: "suppliers", keywords: ["supplier", "distributor"] },
          { to: "/suppliers/invoices", label: "Supplier Invoices", icon: "suppliers", keywords: ["supplier"] },
        ],
      },
      {
        label: "Reports",
        adminOnly: true,
        items: [
          { to: "/reports/daily", label: "Daily Report", icon: "reports", keywords: ["harian"] },
          { to: "/reports/monthly", label: "Monthly Report", icon: "reports", keywords: ["bulanan"] },
        ],
      },
      {
        label: "Admin",
        adminOnly: true,
        items: [{ to: "/admin/users", label: "Users", icon: "users", keywords: ["user", "akun"] }],
      },
    )
  }

  return groups
})

const bottomItems = computed<BottomItem[]>(() => {
  const items: BottomItem[] = [
    { key: "home", to: "/", label: "Home", icon: "home", kind: "link" },
    { key: "sales", to: "/sales", label: "Sales", icon: "sales", kind: "link" },
  ]
  if (role.value === "ADMIN") {
    items.push(
      { key: "inventory", to: "/inventory", label: "Stock", icon: "inventory", kind: "link" },
      { key: "more", label: "Lainnya", icon: "products", kind: "menu" },
    )
  }
  return items
})

const bottomOverflowItems = computed<NavItem[]>(() => {
  if (role.value !== "ADMIN") return []
  return [
    { to: "/products", label: "Products", icon: "products" },
    { to: "/suppliers", label: "Suppliers", icon: "suppliers" },
    { to: "/suppliers/invoices", label: "Supplier Invoices", icon: "suppliers" },
    { to: "/reports/daily", label: "Daily Report", icon: "reports" },
    { to: "/reports/monthly", label: "Monthly Report", icon: "reports" },
    { to: "/admin/users", label: "Users", icon: "users" },
    { to: "/select-store", label: "Ganti Toko", icon: "inventory" },
  ]
})

const navQuery = ref("")

const navCollapsed = ref<Record<string, boolean>>({})
const themeMode = ref<ThemeMode>("system")

let navCollapseTimer: ReturnType<typeof setTimeout> | null = null
let colorSchemeMedia: MediaQueryList | null = null
let colorSchemeHandler: ((event: MediaQueryListEvent) => void) | null = null
let windowKeyHandler: ((event: KeyboardEvent) => void) | null = null

const themeLabel = computed(() => {
  if (themeMode.value === "system") return "Tema: Auto"
  if (themeMode.value === "dark") return "Tema: Gelap"
  return "Tema: Terang"
})

function applyThemeMode(mode: ThemeMode) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  if (mode === "system") {
    root.removeAttribute("data-theme")
    return
  }
  root.setAttribute("data-theme", mode)
}

function cycleThemeMode() {
  if (themeMode.value === "system") {
    themeMode.value = "dark"
    return
  }
  if (themeMode.value === "dark") {
    themeMode.value = "light"
    return
  }
  themeMode.value = "system"
}

onMounted(() => {
  try {
    const raw = localStorage.getItem("mb_nav_collapsed_v1")
    if (raw) navCollapsed.value = JSON.parse(raw) as Record<string, boolean>
  } catch {
    // ignore
  }

  try {
    const rawTheme = localStorage.getItem("mb_theme_mode_v1")
    if (rawTheme === "system" || rawTheme === "dark" || rawTheme === "light") {
      themeMode.value = rawTheme
    }
  } catch {
    // ignore
  }

  applyThemeMode(themeMode.value)
  colorSchemeMedia = window.matchMedia("(prefers-color-scheme: dark)")
  colorSchemeHandler = () => {
    if (themeMode.value === "system") applyThemeMode("system")
  }
  colorSchemeMedia.addEventListener("change", colorSchemeHandler)

  windowKeyHandler = (event: KeyboardEvent) => {
    if (event.key === "Escape") moreMenuOpen.value = false
  }
  window.addEventListener("keydown", windowKeyHandler)
})

onBeforeUnmount(() => {
  if (colorSchemeMedia && colorSchemeHandler) {
    colorSchemeMedia.removeEventListener("change", colorSchemeHandler)
  }
  if (windowKeyHandler) {
    window.removeEventListener("keydown", windowKeyHandler)
  }
})

watch(
  navCollapsed,
  (v) => {
    if (navCollapseTimer) clearTimeout(navCollapseTimer)
    navCollapseTimer = setTimeout(() => {
      try {
        localStorage.setItem("mb_nav_collapsed_v1", JSON.stringify(v))
      } catch {
        // ignore
      }
    }, 300)
  },
  { deep: true },
)

watch(themeMode, (mode) => {
  applyThemeMode(mode)
  try {
    localStorage.setItem("mb_theme_mode_v1", mode)
  } catch {
    // ignore
  }
})

watch(
  () => route.path,
  () => {
    isNavigating.value = true
    setTimeout(() => {
      isNavigating.value = false
    }, 200)
    sidebarOpen.value = false
    moreMenuOpen.value = false
  },
)

watch(bottomOverflowItems, (items) => {
  if (!items.length) moreMenuOpen.value = false
})

function isGroupOpen(label: string) {
  if (navQuery.value.trim()) return true
  return !navCollapsed.value[label]
}

function toggleGroup(label: string) {
  navCollapsed.value[label] = !navCollapsed.value[label]
}

const filteredNavGroups = computed(() => {
  const q = navQuery.value.trim().toLowerCase()
  if (!q) return navGroups.value

  const match = (item: NavItem) => {
    if (item.label.toLowerCase().includes(q)) return true
    if (item.to.toLowerCase().includes(q)) return true
    return (item.keywords ?? []).some((k) => k.toLowerCase().includes(q))
  }

  return navGroups.value
    .map((g) => ({ ...g, items: g.items.filter(match) }))
    .filter((g) => g.items.length > 0)
})

function isActive(path: string) {
  if (path === "/") return route.path === "/"
  return route.path === path || route.path.startsWith(`${path}/`)
}

function isBottomItemActive(item: BottomItem) {
  if (item.kind === "menu") return bottomOverflowItems.value.some((entry) => isActive(entry.to))
  return item.to ? isActive(item.to) : false
}

function toggleMoreMenu() {
  if (!bottomOverflowItems.value.length) return
  moreMenuOpen.value = !moreMenuOpen.value
}

function closeMoreMenu() {
  moreMenuOpen.value = false
}

const pageTitle = computed(() => {
  const allItems = navGroups.value.flatMap((g) => g.items)
  const exact = allItems.find((i) => i.to === route.path)
  if (exact) return exact.label

  const prefix = allItems.find((i) => i.to !== "/" && route.path.startsWith(`${i.to}/`))
  return prefix?.label ?? "Mister Ban ERP"
})

async function logout() {
  try {
    await $fetch("/api/auth/logout", { method: "POST" })
  } catch {
    // ignore network/api logout error, state tetap dibersihkan di client
  }
  me.clear()
  storeContext.clear()
  await navigateTo("/login")
}
</script>

<template>
  <div class="mb-shell">
    <aside class="mb-sidebar">
      <div class="mb-sideBrand">
        <img class="mb-sideLogo" src="/brand/logo.png" alt="Mister Ban" />
        <div class="mb-sideText">
          <div class="mb-sideTitle">Mister Ban</div>
          <div class="mb-sideSub">ERP Dashboard</div>
        </div>
      </div>

      <div class="mb-sideContext">
        <div v-if="storeName" class="mb-pill">{{ storeName }}</div>
        <div v-if="me.user.value" class="mb-sideUser">{{ me.user.value.email }}</div>
        <div v-if="me.user.value" class="mb-sideRole">{{ me.user.value.role }}</div>
      </div>

      <div class="mb-search">
        <input
          v-model="navQuery"
          class="mb-input mb-searchInput"
          type="text"
          placeholder="Search..."
          aria-label="Search menu"
        />
      </div>

      <nav class="mb-nav" aria-label="Main navigation">
        <section v-for="g in filteredNavGroups" :key="g.label" class="mb-navGroup">
          <button type="button" class="mb-navGroupHeader" @click="toggleGroup(g.label)">
            <span class="mb-navGroupTitle">{{ g.label }}</span>
            <span class="mb-navCaret" :class="{ open: isGroupOpen(g.label) }" aria-hidden="true"></span>
          </button>

          <div class="mb-navGroupItems" :class="{ open: isGroupOpen(g.label) }">
            <NuxtLink
              v-for="i in g.items"
              :key="i.to"
              class="mb-navItem"
              :class="{ active: isActive(i.to) }"
              :to="i.to"
            >
              <MbIcon class="mb-navIcon" :name="i.icon" />
              <span class="mb-navLabel">{{ i.label }}</span>
            </NuxtLink>
          </div>
        </section>
      </nav>

      <div class="mb-sideActions">
        <button
          v-if="role === 'ADMIN'"
          class="mb-btn mb-sideActionBtn"
          @click="navigateTo('/select-store')"
        >
          Ganti Toko
        </button>
        <button class="mb-btn mb-sideActionBtn mb-sideActionLogout" @click="logout">
          Logout
        </button>
      </div>
    </aside>

    <div class="mb-main">
      <header class="mb-topbar">
        <div class="mb-topTitle">
          <div class="mb-topH">{{ pageTitle }}</div>
          <div class="mb-topSub">
            <span v-if="storeName">{{ storeName }}</span>
            <template v-if="storeName && me.user.value"><span class="sep">&middot;</span></template>
            <span v-if="me.user.value">{{ me.user.value.email }}</span>
          </div>
        </div>
        <div class="mb-topActions">
          <button class="mb-btnSwitch" type="button" @click="cycleThemeMode">
            <span>{{ themeLabel }}</span>
          </button>
          <slot name="top-actions" />
          <button v-if="role === 'ADMIN'" class="mb-btnSwitch mb-mobileOnly" @click="navigateTo('/select-store')">
            <MbIcon name="inventory" />
            <span>Ganti Toko</span>
          </button>
        </div>
      </header>

      <main class="mb-content" :class="{ 'is-navigating': isNavigating }">
        <Transition name="page-fade" mode="out-in">
          <div :key="route.fullPath">
            <slot />
          </div>
        </Transition>
      </main>

      <nav class="mb-bottomnav" aria-label="Bottom navigation">
        <template
          v-for="i in bottomItems"
          :key="i.key"
        >
          <NuxtLink
            v-if="i.kind === 'link' && i.to"
            class="mb-bottomItem"
            :class="{ active: isBottomItemActive(i) }"
            :to="i.to"
          >
            <MbIcon class="mb-bottomIcon" :name="i.icon" />
            <span class="mb-bottomLabel">{{ i.label }}</span>
          </NuxtLink>
          <button
            v-else
            type="button"
            class="mb-bottomItem mb-bottomItemBtn"
            :class="{ active: isBottomItemActive(i), open: moreMenuOpen }"
            :aria-expanded="moreMenuOpen ? 'true' : 'false'"
            aria-haspopup="true"
            aria-label="Menu lainnya"
            @click="toggleMoreMenu"
          >
            <MbIcon class="mb-bottomIcon" :name="i.icon" />
            <span class="mb-bottomLabel">{{ i.label }}</span>
          </button>
        </template>
      </nav>

      <Transition name="mb-mobile-fade">
        <button
          v-if="moreMenuOpen"
          type="button"
          class="mb-bottomBackdrop"
          aria-label="Tutup menu lainnya"
          @click="closeMoreMenu"
        ></button>
      </Transition>

      <Transition name="mb-mobile-sheet">
        <section v-if="moreMenuOpen && bottomOverflowItems.length" class="mb-bottomSheet" aria-label="Menu lainnya">
          <header class="mb-bottomSheetHead">
            <div class="mb-bottomSheetTitle">Menu Lainnya</div>
            <button type="button" class="mb-bottomSheetClose" @click="closeMoreMenu">Tutup</button>
          </header>
          <div class="mb-bottomSheetGrid">
            <NuxtLink
              v-for="item in bottomOverflowItems"
              :key="item.to"
              class="mb-bottomSheetItem"
              :class="{ active: isActive(item.to) }"
              :to="item.to"
              @click="closeMoreMenu"
            >
              <MbIcon class="mb-bottomSheetIcon" :name="item.icon" />
              <span class="mb-bottomSheetLabel">{{ item.label }}</span>
            </NuxtLink>
          </div>
        </section>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.sep {
  opacity: 0.7;
  padding: 0 6px;
}

.mb-bottomBackdrop,
.mb-bottomSheet {
  display: none;
}

@media (max-width: 900px) {
  .mb-bottomItemBtn {
    font: inherit;
    line-height: inherit;
    cursor: pointer;
    background: transparent;
  }

  .mb-bottomItemBtn.open {
    border-color: var(--mb-accent-hover-border);
    background: var(--mb-accent-hover-bg);
    box-shadow:
      inset 0 0 0 1px var(--mb-accent-outline),
      var(--mb-accent-glow-soft);
  }

  .mb-bottomBackdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 21;
    border: 0;
    background: rgba(8, 10, 15, 0.35);
    backdrop-filter: blur(2px);
  }

  .mb-bottomSheet {
    display: block;
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: calc(88px + env(safe-area-inset-bottom));
    z-index: 22;
    border: 1px solid var(--mb-border2);
    border-radius: 16px;
    background: var(--mb-glass-surface-strong);
    box-shadow: 0 22px 42px rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(18px);
    padding: 10px;
    max-height: min(62vh, 460px);
    overflow-y: auto;
  }

  .mb-bottomSheetHead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 2px 4px 8px;
  }

  .mb-bottomSheetTitle {
    font-size: 13px;
    font-weight: 800;
  }

  .mb-bottomSheetClose {
    height: 28px;
    border-radius: 8px;
    border: 1px solid var(--mb-border2);
    background: var(--mb-surface);
    color: var(--mb-text);
    font-size: 12px;
    font-weight: 700;
    padding: 0 10px;
  }

  .mb-bottomSheetGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .mb-bottomSheetItem {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 10px;
    border-radius: 12px;
    border: 1px solid var(--mb-border2);
    background: var(--mb-surface);
    text-decoration: none;
    color: var(--mb-text);
    font-size: 12px;
    font-weight: 700;
  }

  .mb-bottomSheetItem.active {
    border-color: var(--mb-accent-hover-border);
    background: var(--mb-accent-hover-bg);
    box-shadow:
      inset 0 0 0 1px var(--mb-accent-outline),
      var(--mb-accent-glow-soft);
  }

  .mb-bottomSheetIcon {
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
    opacity: 0.85;
  }

  .mb-bottomSheetLabel {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mb-mobile-fade-enter-active,
  .mb-mobile-fade-leave-active {
    transition: opacity 140ms ease;
  }

  .mb-mobile-fade-enter-from,
  .mb-mobile-fade-leave-to {
    opacity: 0;
  }

  .mb-mobile-sheet-enter-active,
  .mb-mobile-sheet-leave-active {
    transition: transform 180ms ease, opacity 180ms ease;
  }

  .mb-mobile-sheet-enter-from,
  .mb-mobile-sheet-leave-to {
    transform: translateY(8px);
    opacity: 0;
  }
}
</style>
