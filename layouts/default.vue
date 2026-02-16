<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue"

const me = useMe()
const storeContext = useStoreContext()
const route = useRoute()

const role = computed(() => me.user.value?.role ?? null)
const storeName = computed(() => storeContext.store.value?.name ?? null)

const sidebarOpen = ref(false)
const isNavigating = ref(false)

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

const bottomItems = computed(() => {
  const items = [
    { to: "/", label: "Home" },
    { to: "/sales", label: "Sales" },
  ]
  if (role.value === "ADMIN") {
    items.push({ to: "/inventory", label: "Stock" }, { to: "/products", label: "Products" })
  }
  return items
})

const navQuery = ref("")

const navCollapsed = ref<Record<string, boolean>>({})
const themeMode = ref<ThemeMode>("system")

let navCollapseTimer: ReturnType<typeof setTimeout> | null = null
let colorSchemeMedia: MediaQueryList | null = null
let colorSchemeHandler: ((event: MediaQueryListEvent) => void) | null = null

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
})

onBeforeUnmount(() => {
  if (colorSchemeMedia && colorSchemeHandler) {
    colorSchemeMedia.removeEventListener("change", colorSchemeHandler)
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
  },
)

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
        <NuxtLink
          v-for="i in bottomItems"
          :key="i.to"
          class="mb-bottomItem"
          :class="{ active: isActive(i.to) }"
          :to="i.to"
        >
          {{ i.label }}
        </NuxtLink>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.sep {
  opacity: 0.7;
  padding: 0 6px;
}
</style>
