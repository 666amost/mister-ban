<script setup lang="ts">
import { computed, onMounted } from "vue"

definePageMeta({ middleware: "admin" })

type ProductRow = {
  product_id: string
  sku: string
  name: string
  size: string
  brand: string
  product_type: string
  sell_price: number
  qty_on_hand: number
  avg_unit_cost: number
}

type MasterProductRow = {
  product_id: string
  sku: string
  name: string
  size: string
  brand: string
  product_type: string
}

const items = ref<ProductRow[]>([])
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const q = ref("")
const expandedBrands = ref<Set<string>>(new Set())
const expandedTypes = ref<Set<string>>(new Set())

function canonicalBrandLabel(raw: string) {
  const brand = raw.trim()
  if (!brand) return "Lainnya"

  const lower = brand.toLowerCase()
  if (lower.startsWith("maxxis")) return "Maxxis"
  if (lower === "victra" || lower.startsWith("victra ")) return "Maxxis"

  return brand
}

const groupedItems = computed(() => {
  const brandMap = new Map<string, { key: string; label: string; typeMap: Map<string, ProductRow[]> }>()
  for (const row of items.value) {
    const brandLabel = canonicalBrandLabel(row.brand?.trim() || "Lainnya")
    const brandKey = brandLabel.toLowerCase()
    const typeKey = row.product_type?.trim() || "Lainnya"
    let group = brandMap.get(brandKey)
    if (!group) {
      group = { key: brandKey, label: brandLabel, typeMap: new Map() }
      brandMap.set(brandKey, group)
    }
    const bucket = group.typeMap.get(typeKey)
    if (bucket) {
      bucket.push(row)
    } else {
      group.typeMap.set(typeKey, [row])
    }
  }

  const groups = Array.from(brandMap.values()).map((g) => {
    const types = Array.from(g.typeMap.entries())
      .map(([type, rows]) => ({
        type,
        rows: rows.slice().sort((a, b) => {
          const byName = a.name.localeCompare(b.name, "id-ID", { sensitivity: "base" })
          if (byName) return byName
          const bySize = a.size.localeCompare(b.size, "id-ID", { sensitivity: "base" })
          if (bySize) return bySize
          return a.sku.localeCompare(b.sku, "id-ID", { sensitivity: "base" })
        }),
        total: rows.length,
      }))
      .sort((a, b) => a.type.localeCompare(b.type, "id-ID", { sensitivity: "base" }))

    const total = types.reduce((acc, curr) => acc + curr.total, 0)
    return { key: g.key, label: g.label, types, total }
  })

  return groups.sort((a, b) => a.label.localeCompare(b.label, "id-ID", { sensitivity: "base" }))
})

function toggleBrand(brandKey: string) {
  if (expandedBrands.value.has(brandKey)) {
    expandedBrands.value.delete(brandKey)
  } else {
    expandedBrands.value.add(brandKey)
  }
  expandedBrands.value = new Set(expandedBrands.value)
}

function toggleType(brandKey: string, type: string) {
  const key = `${brandKey}||${type}`
  if (expandedTypes.value.has(key)) {
    expandedTypes.value.delete(key)
  } else {
    expandedTypes.value.add(key)
  }
  expandedTypes.value = new Set(expandedTypes.value)
}

const priceEditMode = ref(false)
const priceDrafts = ref<Record<string, number>>({})
const priceDirty = ref<Set<string>>(new Set())
const priceSaveLoading = ref(false)
const priceSaveError = ref<string | null>(null)

const showAdd = ref(false)
const addTab = ref<"new" | "master">("new")

const createForm = reactive({
  brand: "",
  product_type: "",
  name: "",
  size: "",
  sku: "",
  sell_price: 0,
  initial_qty: 0,
  initial_unit_cost: 0,
  is_active: true,
})
const createLoading = ref(false)
const createError = ref<string | null>(null)

const masterQ = ref("")
const masterItems = ref<MasterProductRow[]>([])
const masterRan = ref(false)
const masterLoading = ref(false)
const masterError = ref<string | null>(null)
const selectedMaster = ref<MasterProductRow | null>(null)
const attachSellPrice = ref(0)
const attachInitialQty = ref(0)
const attachUnitCost = ref(0)
const attachLoading = ref(false)
const attachError = ref<string | null>(null)

const masterNewTypeInput = ref("")
const confirmDeleteType = ref(false)
const deleteTypeLoading = ref(false)
const deleteTypeError = ref<string | null>(null)

const masterBrands = ref<{ id: string; name: string }[]>([])
const masterBrandId = ref("")
const masterTypes = ref<string[]>([])
const masterType = ref("")
const masterFiltersLoading = ref(false)

const showCreateDerived = ref(false)
const derivedForm = reactive({
  name: "",
  size: "",
  sell_price: 0,
  initial_qty: 0,
  initial_unit_cost: 0,
  sku: "",
})
const derivedLoading = ref(false)
const derivedError = ref<string | null>(null)

const createTypeSuggestions = ref<string[]>([])

const filteredCreateTypeSuggestions = computed(() => {
  const input = createForm.product_type.toLowerCase().trim()
  if (!input) return createTypeSuggestions.value
  return createTypeSuggestions.value.filter((t) => t.toLowerCase().includes(input))
})

const skuSlugPreview = computed(() => {
  const base = [createForm.brand, createForm.name, createForm.size].map((s) => s.trim()).filter(Boolean).join(" ")
  if (!base) return null
  return (
    base
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s/-]+/g, "")
      .trim()
      .replace(/[\s/]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50) + "-XXXXXXXX"
  )
})

const effectiveMasterType = computed(() =>
  masterType.value === "__new__" ? masterNewTypeInput.value.trim() : masterType.value,
)

const existingStoreTypes = computed(() => {
  const seen = new Map<string, string>()
  for (const row of items.value) {
    const t = row.product_type?.trim()
    if (t) {
      const key = t.toLowerCase()
      if (!seen.has(key)) seen.set(key, t)
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, "id-ID", { sensitivity: "base" }))
})

const existingStoreBrands = computed(() => {
  const seen = new Map<string, string>()
  for (const row of items.value) {
    const b = row.brand?.trim()
    if (b) {
      const key = b.toLowerCase()
      if (!seen.has(key)) seen.set(key, b)
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, "id-ID", { sensitivity: "base" }))
})

const allBrandSuggestions = computed(() => {
  const seen = new Map<string, string>()
  for (const b of existingStoreBrands.value) {
    seen.set(b.toLowerCase(), b)
  }
  for (const b of masterBrands.value) {
    const key = b.name.toLowerCase()
    if (!seen.has(key)) seen.set(key, b.name)
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, "id-ID", { sensitivity: "base" }))
})

function resolveExistingBrand(input: string): string {
  const trimmed = input.trim()
  const lower = trimmed.toLowerCase()
  const match = existingStoreBrands.value.find((b) => b.toLowerCase() === lower)
  return match ?? trimmed
}

const editingId = ref<string | null>(null)
const editSellPrice = ref(0)
const editLoading = ref(false)
const editError = ref<string | null>(null)

const editingMasterId = ref<string | null>(null)
const masterName = ref("")
const masterSize = ref("")
const masterSku = ref("")
const masterProductType = ref("")
const masterProductTypeCustom = ref("")
const masterEditLoading = ref(false)
const masterEditError = ref<string | null>(null)

const removingId = ref<string | null>(null)
const removeError = ref<string | null>(null)
const confirmDeleteId = ref<string | null>(null)

type Toast = { id: number; message: string; type: "success" | "error" }
const toasts = ref<Toast[]>([])
let toastSeq = 0

function showToast(message: string, type: Toast["type"] = "success") {
  const id = ++toastSeq
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 3000)
}

const stockingId = ref<string | null>(null)
const stockQtyDelta = ref(0)
const stockUnitCost = ref(0)
const stockNote = ref("")
const stockLoading = ref(false)
const stockError = ref<string | null>(null)

function slugPart(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s/-]+/g, "")
    .trim()
    .replace(/[\s/]+/g, "-")
    .replace(/-+/g, "-")
}

function shortRand() {
  const n = Math.floor(Math.random() * 0xffffffff)
  return n.toString(16).padStart(8, "0").slice(0, 8)
}

function generateSku({ brand, name, size }: { brand: string; name: string; size: string }) {
  const base = [brand, name, size].map((s) => s.trim()).filter(Boolean).join(" ")
  const slug = slugPart(base).slice(0, 50)
  return `${slug}-${shortRand()}`
}

function rupiah(value: number) {
  return value.toLocaleString("id-ID")
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

function productDisplayName(brand: string, name: string) {
  const brandTrimmed = brand.trim()
  const nameTrimmed = name.trim()

  if (!brandTrimmed) return nameTrimmed
  if (!nameTrimmed) return brandTrimmed

  const brandNormalized = normalizeText(brandTrimmed)
  const nameNormalized = normalizeText(nameTrimmed)
  if (nameNormalized === brandNormalized || nameNormalized.startsWith(`${brandNormalized} `)) {
    return nameTrimmed
  }

  return `${brandTrimmed} ${nameTrimmed}`.replace(/\s+/g, " ").trim()
}

function statusMessage(error: unknown) {
  if (!error || typeof error !== "object") return null
  const e = error as Record<string, unknown>
  return typeof e.statusMessage === "string" ? e.statusMessage : null
}

function resetPriceDrafts() {
  priceDrafts.value = Object.fromEntries(items.value.map((i) => [i.product_id, i.sell_price])) as Record<string, number>
  priceDirty.value = new Set()
}

function startPriceEditMode() {
  cancelEdit()
  priceEditMode.value = true
  priceSaveError.value = null
  resetPriceDrafts()
}

function cancelPriceEditMode() {
  priceEditMode.value = false
  priceDrafts.value = {}
  priceDirty.value = new Set()
  priceSaveError.value = null
}

function syncPriceDraft(productId: string) {
  const rawValue = priceDrafts.value[productId] ?? 0
  const normalized = Number.isFinite(rawValue) ? Math.max(0, Math.trunc(rawValue)) : 0
  priceDrafts.value[productId] = normalized
  const original = items.value.find((i) => i.product_id === productId)?.sell_price ?? 0
  if (normalized === original) {
    priceDirty.value.delete(productId)
  } else {
    priceDirty.value.add(productId)
  }
  priceDirty.value = new Set(priceDirty.value)
}

async function saveAllPriceEdits() {
  if (priceDirty.value.size === 0) return
  priceSaveLoading.value = true
  priceSaveError.value = null
  try {
    for (const productId of priceDirty.value) {
      await $fetch(`/api/products/${productId}`, {
        method: "PATCH",
        body: { sell_price: priceDrafts.value[productId] ?? 0 },
      })
    }
    cancelPriceEditMode()
    await load()
  } catch (error) {
    priceSaveError.value = statusMessage(error) ?? "Gagal simpan perubahan harga"
  } finally {
    priceSaveLoading.value = false
  }
}

async function load() {
  isLoading.value = true
  errorMessage.value = null
  try {
    const res = await $fetch<{ items: ProductRow[] }>("/api/products", {
      query: { q: q.value, limit: 500, _t: Date.now() },
      headers: { Accept: "application/json" },
    })
    items.value = res.items
    if (priceEditMode.value) {
      resetPriceDrafts()
    }
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal memuat products"
    console.error("Products load error:", error)
  } finally {
    isLoading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(q, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    load()
  }, 300)
})

function resetCreateForm() {
  createForm.brand = ""
  createForm.product_type = ""
  createForm.name = ""
  createForm.size = ""
  createForm.sku = ""
  createForm.sell_price = 0
  createForm.initial_qty = 0
  createForm.initial_unit_cost = 0
  createForm.is_active = true
}

async function createProduct() {
  createLoading.value = true
  createError.value = null
  try {
    const resolvedType = createForm.product_type.trim()
    if (!resolvedType) {
      createError.value = "Tipe Produk wajib diisi"
      createLoading.value = false
      return
    }
    const resolvedBrand = resolveExistingBrand(createForm.brand)
    const sku = createForm.sku.trim().length
      ? createForm.sku.trim()
      : generateSku({ brand: resolvedBrand, name: createForm.name, size: createForm.size })
    await $fetch("/api/products", {
      method: "POST",
      body: {
        brand: resolvedBrand,
        product_type: resolvedType,
        name: createForm.name,
        size: createForm.size,
        sku,
        sell_price: createForm.sell_price,
        initial_qty: createForm.initial_qty,
        initial_unit_cost: createForm.initial_unit_cost,
        is_active: createForm.is_active,
      },
    })
    resetCreateForm()
    showAdd.value = false
    await load()
    const brandKey = canonicalBrandLabel(resolvedBrand).toLowerCase()
    expandedBrands.value = new Set([...expandedBrands.value, brandKey])
    showToast("Produk berhasil ditambahkan")
  } catch (error) {
    createError.value = statusMessage(error) ?? "Gagal membuat produk"
  } finally {
    createLoading.value = false
  }
}

async function loadMasterFilters() {
  masterFiltersLoading.value = true
  masterError.value = null
  try {
    const res = await $fetch<{ brands: { id: string; name: string }[] }>("/api/products/master/filters")
    masterBrands.value = res.brands
  } catch (error) {
    masterError.value = statusMessage(error) ?? "Gagal memuat daftar brand"
  } finally {
    masterFiltersLoading.value = false
  }
}

async function onBrandChange() {
  masterType.value = ""
  masterTypes.value = []
  masterItems.value = []
  masterRan.value = false
  selectedMaster.value = null
  attachError.value = null
  masterNewTypeInput.value = ""
  confirmDeleteType.value = false
  deleteTypeError.value = null

  if (!masterBrandId.value) return

  try {
    const res = await $fetch<{ brands: { id: string; name: string }[]; types: { product_type: string }[] }>(
      "/api/products/master/filters",
      { query: { brand_id: masterBrandId.value } },
    )
    masterTypes.value = res.types.map((t) => t.product_type)
  } catch (error) {
    masterError.value = statusMessage(error) ?? "Gagal memuat tipe produk"
  }
}

async function searchMaster() {
  if (!masterBrandId.value) return
  masterLoading.value = true
  masterError.value = null
  attachError.value = null
  try {
    const res = await $fetch<{ items: MasterProductRow[] }>("/api/products/master", {
      query: {
        brand_id: masterBrandId.value,
        product_type: masterType.value || undefined,
        q: masterQ.value || undefined,
        limit: 100,
      },
    })
    masterItems.value = res.items
  } catch (error) {
    masterError.value = statusMessage(error) ?? "Gagal mencari master produk"
  } finally {
    masterLoading.value = false
    masterRan.value = true
  }
}

watch(masterType, () => {
  if (masterBrandId.value) {
    selectedMaster.value = null
    showCreateDerived.value = false
    masterNewTypeInput.value = ""
    confirmDeleteType.value = false
    deleteTypeError.value = null
    if (masterType.value !== "__new__") {
      searchMaster()
    } else {
      masterItems.value = []
      masterRan.value = false
    }
  }
})

watch(
  [showAdd, addTab],
  ([show]) => {
    if (show && masterBrands.value.length === 0) {
      loadMasterFilters()
    }
  },
)

watch(
  () => createForm.product_type,
  () => {
    confirmDeleteType.value = false
    deleteTypeError.value = null
  },
)

watch(
  () => createForm.brand,
  async (val) => {
    const trimmed = val.trim()
    const lower = trimmed.toLowerCase()
    createForm.product_type = ""
    confirmDeleteType.value = false
    deleteTypeError.value = null

    const storeTypes = Array.from(
      new Set(
        items.value
          .filter((r) => r.brand?.trim().toLowerCase() === lower)
          .map((r) => r.product_type?.trim())
          .filter(Boolean),
      ),
    ) as string[]

    const matched = masterBrands.value.find((b) => b.name.toLowerCase() === lower)
    if (!matched) {
      createTypeSuggestions.value = storeTypes.sort((a, b) => a.localeCompare(b, "id-ID", { sensitivity: "base" }))
      return
    }
    try {
      const res = await $fetch<{ brands: { id: string; name: string }[]; types: { product_type: string }[] }>(
        "/api/products/master/filters",
        { query: { brand_id: matched.id } },
      )
      const masterTypes2 = res.types.map((t) => t.product_type)
      const merged = Array.from(new Set([...storeTypes, ...masterTypes2]))
      createTypeSuggestions.value = merged.sort((a, b) => a.localeCompare(b, "id-ID", { sensitivity: "base" }))
    } catch {
      createTypeSuggestions.value = storeTypes
    }
  },
)

async function deleteCreateFormType() {
  const brandLower = createForm.brand.trim().toLowerCase()
  const brand = masterBrands.value.find((b) => b.name.toLowerCase() === brandLower)
  if (!brand || !createForm.product_type.trim()) return
  deleteTypeLoading.value = true
  deleteTypeError.value = null
  try {
    await $fetch("/api/products/master/type", {
      method: "DELETE",
      query: { brand_id: brand.id, product_type: createForm.product_type.trim() },
    })
    const deletedType = createForm.product_type.trim()
    createTypeSuggestions.value = createTypeSuggestions.value.filter((t) => t !== deletedType)
    createForm.product_type = ""
    confirmDeleteType.value = false
    showToast(`Tipe "${deletedType}" dari ${brand.name} berhasil dihapus`)
    await load()
  } catch (error) {
    deleteTypeError.value = statusMessage(error) ?? "Gagal menghapus tipe produk"
  } finally {
    deleteTypeLoading.value = false
  }
}

function selectMaster(p: MasterProductRow) {
  selectedMaster.value = p
  attachSellPrice.value = 0
  attachInitialQty.value = 0
  attachUnitCost.value = 0
  attachError.value = null
  showCreateDerived.value = false
  derivedError.value = null
}

function toggleCreateDerived() {
  showCreateDerived.value = !showCreateDerived.value
  confirmDeleteType.value = false
  selectedMaster.value = null
  derivedError.value = null
  derivedForm.name = ""
  derivedForm.size = ""
  derivedForm.sell_price = 0
  derivedForm.initial_qty = 0
  derivedForm.initial_unit_cost = 0
  derivedForm.sku = ""
}

async function deleteProductType() {
  if (!masterBrandId.value || !masterType.value || masterType.value === "__new__") return
  deleteTypeLoading.value = true
  deleteTypeError.value = null
  try {
    await $fetch("/api/products/master/type", {
      method: "DELETE",
      query: { brand_id: masterBrandId.value, product_type: masterType.value },
    })
    const deletedType = masterType.value
    const brandName = masterBrands.value.find((b) => b.id === masterBrandId.value)?.name ?? ""
    masterTypes.value = masterTypes.value.filter((t) => t !== deletedType)
    masterType.value = ""
    masterItems.value = []
    masterRan.value = false
    confirmDeleteType.value = false
    showCreateDerived.value = false
    showToast(`Tipe "${deletedType}" dari ${brandName} berhasil dihapus`)
    await load()
  } catch (error) {
    deleteTypeError.value = statusMessage(error) ?? "Gagal menghapus tipe produk"
  } finally {
    deleteTypeLoading.value = false
  }
}

async function createDerived() {
  const brand = masterBrands.value.find((b) => b.id === masterBrandId.value)
  if (!brand || !effectiveMasterType.value) return
  derivedLoading.value = true
  derivedError.value = null
  try {
    const productName = derivedForm.name.trim() || effectiveMasterType.value
    const sku = derivedForm.sku.trim() || generateSku({ brand: brand.name, name: productName, size: derivedForm.size })
    await $fetch("/api/products", {
      method: "POST",
      body: {
        brand: brand.name,
        product_type: effectiveMasterType.value,
        name: productName,
        size: derivedForm.size.trim(),
        sku,
        sell_price: derivedForm.sell_price,
        initial_qty: derivedForm.initial_qty,
        initial_unit_cost: derivedForm.initial_unit_cost,
        is_active: true,
      },
    })
    showCreateDerived.value = false
    derivedForm.name = ""
    derivedForm.size = ""
    derivedForm.sell_price = 0
    derivedForm.initial_qty = 0
    derivedForm.initial_unit_cost = 0
    derivedForm.sku = ""
    await searchMaster()
    await load()
  } catch (error) {
    derivedError.value = statusMessage(error) ?? "Gagal membuat produk baru"
  } finally {
    derivedLoading.value = false
  }
}

async function attachSelected() {
  if (!selectedMaster.value) return
  attachLoading.value = true
  try {
    await $fetch("/api/products/attach", {
      method: "POST",
      body: {
        product_id: selectedMaster.value.product_id,
        sell_price: attachSellPrice.value,
        is_active: true,
      },
    })
    if (attachInitialQty.value > 0) {
      await $fetch("/api/inventory/adjust", {
        method: "POST",
        body: {
          product_id: selectedMaster.value.product_id,
          qty_delta: attachInitialQty.value,
          unit_cost: attachUnitCost.value,
          note: "initial stock (attach)",
        },
      })
    }
    await load()
    const addedBrand = selectedMaster.value?.brand ?? ""
    const brandKey = canonicalBrandLabel(addedBrand).toLowerCase()
    expandedBrands.value = new Set([...expandedBrands.value, brandKey])
    showToast("Produk berhasil ditambahkan ke toko")
    selectedMaster.value = null
    showAdd.value = false
    masterBrandId.value = ""
    masterType.value = ""
    masterItems.value = []
    masterRan.value = false
  } catch (error) {
    attachError.value = statusMessage(error) ?? "Gagal menambahkan produk ke toko"
  } finally {
    attachLoading.value = false
  }
}

function startEdit(row: ProductRow) {
  editingId.value = row.product_id
  editSellPrice.value = row.sell_price
  editError.value = null
}

function cancelEdit() {
  editingId.value = null
  editSellPrice.value = 0
  editError.value = null
}

async function saveEdit(productId: string) {
  editLoading.value = true
  editError.value = null
  try {
    await $fetch(`/api/products/${productId}`, { method: "PATCH", body: { sell_price: editSellPrice.value } })
    const target = items.value.find((r) => r.product_id === productId)
    if (target) {
      target.sell_price = editSellPrice.value
      if (priceEditMode.value) priceDrafts.value[productId] = editSellPrice.value
    }
    cancelEdit()
    showToast("Harga berhasil diperbarui")
    load()
  } catch (error) {
    editError.value = statusMessage(error) ?? "Gagal update sell price"
  } finally {
    editLoading.value = false
  }
}

function startEditMaster(row: ProductRow) {
  editingMasterId.value = row.product_id
  masterName.value = row.name
  masterSize.value = row.size
  masterSku.value = row.sku
  masterProductType.value = row.product_type || ""
  masterProductTypeCustom.value = ""
  masterEditError.value = null
}

function cancelEditMaster() {
  editingMasterId.value = null
  masterName.value = ""
  masterSize.value = ""
  masterSku.value = ""
  masterProductType.value = ""
  masterProductTypeCustom.value = ""
  masterEditError.value = null
}

async function saveEditMaster(productId: string) {
  masterEditLoading.value = true
  masterEditError.value = null
  try {
    const resolvedType = masterProductType.value === "__custom__"
      ? masterProductTypeCustom.value.trim()
      : masterProductType.value
    if (!resolvedType) {
      masterEditError.value = "Tipe Produk wajib diisi"
      masterEditLoading.value = false
      return
    }
    await $fetch(`/api/products/master/${productId}`, {
      method: "PATCH",
      body: { name: masterName.value, size: masterSize.value, sku: masterSku.value, product_type: resolvedType },
    })
    const target = items.value.find((r) => r.product_id === productId)
    if (target) {
      target.name = masterName.value
      target.size = masterSize.value
      target.sku = masterSku.value
      target.product_type = resolvedType
    }
    cancelEditMaster()
    showToast("Produk berhasil diperbarui")
    load()
  } catch (error) {
    masterEditError.value = statusMessage(error) ?? "Gagal update master product"
  } finally {
    masterEditLoading.value = false
  }
}

function promptDelete(productId: string) {
  confirmDeleteId.value = productId
  removeError.value = null
}

function cancelDelete() {
  confirmDeleteId.value = null
  removeError.value = null
}

async function removeFromStore(productId: string) {
  confirmDeleteId.value = null
  removingId.value = productId
  removeError.value = null
  const snapshot = items.value.slice()
  const deleted = snapshot.find((r) => r.product_id === productId)
  items.value = items.value.filter((r) => r.product_id !== productId)
  if (editingId.value === productId) cancelEdit()
  if (stockingId.value === productId) cancelStock()
  if (editingMasterId.value === productId) cancelEditMaster()
  if (priceEditMode.value) {
    delete priceDrafts.value[productId]
    priceDirty.value.delete(productId)
    priceDirty.value = new Set(priceDirty.value)
  }
  try {
    await $fetch("/api/products/detach", { method: "POST", body: { product_id: productId } })
    const label = deleted ? `${deleted.brand} ${deleted.name} ${deleted.size}`.trim() : "Produk"
    showToast(`${label} berhasil dihapus dari toko`)
    await load()
  } catch (error) {
    items.value = snapshot
    removeError.value = statusMessage(error) ?? "Gagal menghapus produk dari toko"
    showToast(removeError.value, "error")
  } finally {
    removingId.value = null
  }
}

function startStock(row: ProductRow) {
  stockingId.value = row.product_id
  stockQtyDelta.value = 0
  stockUnitCost.value = row.avg_unit_cost ?? 0
  stockNote.value = ""
  stockError.value = null
}

function cancelStock() {
  stockingId.value = null
  stockQtyDelta.value = 0
  stockUnitCost.value = 0
  stockNote.value = ""
  stockError.value = null
}

async function submitStock(productId: string) {
  stockLoading.value = true
  stockError.value = null
  try {
    await $fetch("/api/inventory/adjust", {
      method: "POST",
      body: {
        product_id: productId,
        qty_delta: stockQtyDelta.value,
        unit_cost: stockQtyDelta.value > 0 ? stockUnitCost.value : undefined,
        note: stockNote.value.trim().length ? stockNote.value.trim() : undefined,
      },
    })
    const target = items.value.find((r) => r.product_id === productId)
    if (target) {
      target.qty_on_hand = (target.qty_on_hand ?? 0) + stockQtyDelta.value
    }
    cancelStock()
    showToast("Stok berhasil diperbarui")
    load()
  } catch (error) {
    stockError.value = statusMessage(error) ?? "Gagal adjust stok"
  } finally {
    stockLoading.value = false
  }
}

onMounted(async () => {
  await load()
})
</script>

<template>
  <div class="page">
    <section class="mb-card">
      <div class="row">
        <label class="field">
          <span>Cari</span>
          <input v-model="q" class="mb-input" placeholder="SKU / brand / nama..." @keydown.enter.prevent="load()" />
        </label>
        <div class="rowActions">
          <button class="mb-btn" :disabled="isLoading" @click="load()">{{ isLoading ? "Loading..." : "Search" }}</button>
          <button :class="priceEditMode ? 'mb-btnDanger' : 'mb-btn'" type="button" @click="priceEditMode ? cancelPriceEditMode() : startPriceEditMode()">
            {{ priceEditMode ? "Batal Edit Harga" : "Edit Harga" }}
          </button>
          <button
            v-if="priceEditMode"
            class="mb-btnPrimary"
            type="button"
            :disabled="priceSaveLoading || priceDirty.size === 0"
            @click="saveAllPriceEdits"
          >
            {{ priceSaveLoading ? "Saving..." : `Save ${priceDirty.size} Perubahan` }}
          </button>
          <button class="mb-btnPrimary" type="button" @click="showAdd = !showAdd">
            {{ showAdd ? "Tutup" : "Tambah Produk" }}
          </button>
        </div>
      </div>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p v-if="priceEditMode && priceSaveError" class="error">{{ priceSaveError }}</p>
    </section>

    <section v-if="showAdd" class="mb-card">
      <div class="tabs" role="tablist" aria-label="Tambah produk">
        <button class="tab" :class="{ active: addTab === 'new' }" type="button" @click="addTab = 'new'">Buat</button>
        <button class="tab" :class="{ active: addTab === 'master' }" type="button" @click="addTab = 'master'">
          Dari Master
        </button>
      </div>

      <form v-if="addTab === 'new'" class="createForm" @submit.prevent="createProduct">
        <div class="formSection">
          <div class="formSectionTitle">Identitas Produk</div>
          <div class="formSectionBody">
            <label class="field">
              <span>Brand <span class="required">*</span></span>
              <input v-model="createForm.brand" list="brandSuggestions" class="mb-input" placeholder="Contoh: Maxxis, Aspira..." required />
              <datalist id="brandSuggestions">
                <option v-for="b in allBrandSuggestions" :key="b" :value="b" />
              </datalist>
            </label>
            <label class="field">
              <span>Tipe Produk <span class="required">*</span></span>
              <input
                v-model="createForm.product_type"
                class="mb-input"
                placeholder="Pilih dari chip di bawah atau ketik tipe baru..."
                required
              />
              <div v-if="filteredCreateTypeSuggestions.length > 0" class="chipList">
                <button
                  v-for="t in filteredCreateTypeSuggestions"
                  :key="t"
                  type="button"
                  class="chip"
                  :class="{ active: createForm.product_type === t }"
                  @click="createForm.product_type = createForm.product_type === t ? '' : t"
                >{{ t }}</button>
              </div>
              <span
                v-else-if="createForm.product_type.trim() && !createTypeSuggestions.includes(createForm.product_type.trim())"
                class="typeNewBadge"
              >Tipe baru: <strong>{{ createForm.product_type.trim() }}</strong></span>
              <div
                v-if="createTypeSuggestions.includes(createForm.product_type.trim()) && createForm.product_type.trim()"
                class="deleteTypeBar"
              >
                <button
                  type="button"
                  class="mb-btn deleteTypeBtn"
                  :disabled="deleteTypeLoading"
                  @click="confirmDeleteType = !confirmDeleteType"
                >
                  Hapus Tipe Ini
                </button>
              </div>
              <div v-if="confirmDeleteType && createTypeSuggestions.includes(createForm.product_type.trim()) && addTab === 'new'" class="deleteTypeConfirm">
                <span class="deleteConfirmLabel">Hapus tipe <strong>{{ createForm.product_type.trim() }}</strong> dari <strong>{{ createForm.brand }}</strong>?<br><small>Semua master produk dengan tipe ini akan dinonaktifkan.</small></span>
                <div class="deleteTypeActions">
                  <button class="mb-btnDanger" type="button" :disabled="deleteTypeLoading" @click="deleteCreateFormType">
                    {{ deleteTypeLoading ? "Menghapus..." : "Ya, Hapus Tipe" }}
                  </button>
                  <button class="mb-btn" type="button" :disabled="deleteTypeLoading" @click="confirmDeleteType = false">Batal</button>
                </div>
                <p v-if="deleteTypeError" class="error">{{ deleteTypeError }}</p>
              </div>
            </label>
            <label class="field">
              <span>Nama Model <span class="required">*</span></span>
              <input v-model="createForm.name" class="mb-input" placeholder="Contoh: Victra S98 CT" required />
            </label>
            <label class="field">
              <span>Ukuran / Varian</span>
              <input v-model="createForm.size" class="mb-input" placeholder="Contoh: 110/70-12, 1L, Universal..." />
            </label>
          </div>
        </div>

        <div class="formSection">
          <div class="formSectionTitle">Harga &amp; Stok</div>
          <div class="formSectionBody">
            <label class="field">
              <span>Harga Jual (Rp) <span class="required">*</span></span>
              <input v-model.number="createForm.sell_price" class="mb-input" type="number" min="0" required />
            </label>
            <label class="field">
              <span>Stok Awal</span>
              <input v-model.number="createForm.initial_qty" class="mb-input" type="number" min="0" />
            </label>
            <label class="field">
              <span title="Harga beli/modal per unit untuk stok awal">Harga Beli (Rp)</span>
              <input v-model.number="createForm.initial_unit_cost" class="mb-input" type="number" min="0" />
            </label>
          </div>
        </div>

        <div class="formSection">
          <div class="formSectionTitle">SKU <span class="fieldOptional">(opsional)</span></div>
          <div class="formSectionBody skuSection">
            <label class="field skuFullField">
              <span>SKU</span>
              <input v-model="createForm.sku" class="mb-input" placeholder="Kosongkan untuk auto-generate" />
              <span v-if="skuSlugPreview && !createForm.sku.trim()" class="skuPreview">
                Preview: <code>{{ skuSlugPreview }}</code>
              </span>
            </label>
          </div>
        </div>

        <div class="actions">
          <button class="mb-btnPrimary" type="submit" :disabled="createLoading">
            {{ createLoading ? "Menyimpan..." : "Simpan" }}
          </button>
          <button class="mb-btn" type="button" :disabled="createLoading" @click="resetCreateForm">Reset</button>
        </div>
        <p v-if="createError" class="error">{{ createError }}</p>
      </form>

      <div v-else class="master">
        <p v-if="masterError" class="error">{{ masterError }}</p>
        <p v-if="attachError" class="error">{{ attachError }}</p>

        <div class="masterFilters">
          <label class="field">
            <span>Brand</span>
            <select v-model="masterBrandId" class="mb-input" :disabled="masterFiltersLoading" @change="onBrandChange">
              <option value="">{{ masterFiltersLoading ? "Memuat..." : "-- Pilih Brand --" }}</option>
              <option v-for="b in masterBrands" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
          </label>

          <label v-if="masterBrandId" class="field">
            <span>Tipe Produk</span>
            <select v-model="masterType" class="mb-input">
              <option value="">-- Semua Tipe --</option>
              <option v-for="t in masterTypes" :key="t" :value="t">{{ t }}</option>
              <option value="__new__">+ Tambah tipe baru...</option>
            </select>
            <input
              v-if="masterType === '__new__'"
              v-model="masterNewTypeInput"
              class="mb-input"
              placeholder="Ketik nama tipe baru (mis: Adrenalin Pro)"
              style="margin-top: 4px"
            />
          </label>

          <label v-if="masterBrandId" class="field">
            <span>Filter Nama / Ukuran (opsional)</span>
            <input v-model="masterQ" class="mb-input" placeholder="Contoh: 110/70-12, AX5, Universal..." @keydown.enter.prevent="searchMaster" />
          </label>

          <button v-if="masterBrandId" class="mb-btn" :disabled="masterLoading" @click="searchMaster">
            {{ masterLoading ? "Loading..." : "Cari" }}
          </button>
        </div>

        <div v-if="masterItems.length" class="masterGrid">
          <button
            v-for="p in masterItems"
            :key="p.product_id"
            type="button"
            class="masterPick"
            :class="{ active: selectedMaster?.product_id === p.product_id }"
            @click="selectMaster(p)"
          >
            <div class="mTitle">{{ productDisplayName(p.brand, p.name) }} {{ p.size }}</div>
            <div class="mSub">{{ p.sku }} • {{ p.product_type }}</div>
          </button>
        </div>
        <div v-else-if="masterRan && !masterLoading" class="empty">Tidak ada hasil.</div>
        <div v-else-if="!masterBrandId && !masterFiltersLoading" class="empty">Pilih brand terlebih dahulu.</div>

        <div v-if="masterBrandId && (masterType && masterType !== '__new__' || masterNewTypeInput.trim())" class="derivedBar">
          <button type="button" class="mb-btn" @click="toggleCreateDerived">
            {{ showCreateDerived ? "Batal" : "+ Buat Varian Baru" }}
          </button>
          <button
            v-if="masterType && masterType !== '__new__'"
            type="button"
            class="mb-btn deleteTypeBtn"
            :disabled="deleteTypeLoading"
            @click="confirmDeleteType = !confirmDeleteType; showCreateDerived = false"
          >
            Hapus Tipe Ini
          </button>
          <span class="derivedHint">{{ masterBrands.find(b => b.id === masterBrandId)?.name }} — {{ effectiveMasterType }}</span>
        </div>

        <div v-if="confirmDeleteType && masterType && masterType !== '__new__'" class="deleteTypeConfirm">
          <span class="deleteConfirmLabel">Hapus tipe <strong>{{ masterType }}</strong> dari <strong>{{ masterBrands.find(b => b.id === masterBrandId)?.name }}</strong>?<br><small>Semua master produk dengan tipe ini akan dinonaktifkan.</small></span>
          <div class="deleteTypeActions">
            <button class="mb-btnDanger" type="button" :disabled="deleteTypeLoading" @click="deleteProductType">
              {{ deleteTypeLoading ? "Menghapus..." : "Ya, Hapus Tipe" }}
            </button>
            <button class="mb-btn" type="button" :disabled="deleteTypeLoading" @click="confirmDeleteType = false">Batal</button>
          </div>
          <p v-if="deleteTypeError" class="error">{{ deleteTypeError }}</p>
        </div>

        <div v-if="showCreateDerived && masterBrandId && effectiveMasterType" class="attachCard">
          <div class="attachTitle">Buat Produk Baru</div>
          <div class="attachSub">Brand: {{ masterBrands.find(b => b.id === masterBrandId)?.name }} • Tipe: {{ effectiveMasterType }}</div>
          <div class="attachForm">
            <label class="field">
              <span>Nama Produk <span class="required">*</span></span>
              <input v-model="derivedForm.name" class="mb-input" :placeholder="masterType" required />
            </label>
            <label class="field">
              <span>Ukuran / Varian</span>
              <input v-model="derivedForm.size" class="mb-input" placeholder="Contoh: 110/70-12, 1L, Universal (opsional)" />
            </label>
            <label class="field">
              <span>Sell Price (Rp)</span>
              <input v-model.number="derivedForm.sell_price" class="mb-input" type="number" min="0" />
            </label>
            <label class="field">
              <span>Stok Awal</span>
              <input v-model.number="derivedForm.initial_qty" class="mb-input" type="number" min="0" />
            </label>
            <label class="field">
              <span title="Harga beli/modal per unit">Harga Beli (Rp)</span>
              <input v-model.number="derivedForm.initial_unit_cost" class="mb-input" type="number" min="0" />
            </label>
            <label class="field">
              <span>SKU (optional)</span>
              <input v-model="derivedForm.sku" class="mb-input" placeholder="Kosongkan untuk auto-generate" />
            </label>
          </div>
          <div class="actions">
            <button class="mb-btnPrimary" type="button" :disabled="derivedLoading || (!derivedForm.name.trim() && !effectiveMasterType)" @click="createDerived">
              {{ derivedLoading ? "Menyimpan..." : "Simpan Produk Baru" }}
            </button>
            <button class="mb-btn" type="button" :disabled="derivedLoading" @click="toggleCreateDerived">Batal</button>
          </div>
          <p v-if="derivedError" class="error">{{ derivedError }}</p>
        </div>

        <div v-if="selectedMaster" class="attachCard">
          <div class="attachTitle">Tambahkan ke toko</div>
          <div class="attachSub">{{ productDisplayName(selectedMaster.brand, selectedMaster.name) }} {{ selectedMaster.size }}</div>
          <div class="attachForm">
            <label class="field">
              <span>Sell Price (Rp)</span>
              <input v-model.number="attachSellPrice" class="mb-input" type="number" min="0" />
            </label>
            <label class="field">
              <span>Tambah Stok</span>
              <input v-model.number="attachInitialQty" class="mb-input" type="number" min="0" />
            </label>
            <label class="field">
              <span title="Harga beli/modal per unit untuk stok awal">Harga Beli (Rp)</span>
              <input v-model.number="attachUnitCost" class="mb-input" type="number" min="0" />
            </label>
          </div>
          <div class="actions">
            <button class="mb-btnPrimary" type="button" :disabled="attachLoading" @click="attachSelected">
              {{ attachLoading ? "Menambahkan..." : "Tambah" }}
            </button>
            <button class="mb-btn" type="button" :disabled="attachLoading" @click="selectedMaster = null">Batal</button>
          </div>
        </div>
      </div>
    </section>

    <section class="mb-card">
      <div v-if="items.length" class="tableWrap">
        <table class="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nama Produk</th>
              <th style="text-align: right">Harga Jual</th>
              <th style="text-align: right">Stok</th>
              <th style="width: 1%"></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in groupedItems" :key="group.key">
              <tr class="groupRow">
                <td :colspan="5">
                  <button class="groupToggle" type="button" @click="toggleBrand(group.key)">
                    <span class="chevron">{{ expandedBrands.has(group.key) ? "▾" : "▸" }}</span>
                    {{ group.label }} ({{ group.total }})
                  </button>
                </td>
              </tr>
              <template v-if="expandedBrands.has(group.key)">
                <template v-for="typeGroup in group.types" :key="`${group.key}::${typeGroup.type}`">
                  <tr class="typeRow">
                    <td :colspan="5">
                      <button class="typeToggle" type="button" @click="toggleType(group.key, typeGroup.type)">
                        <span class="chevron">{{ expandedTypes.has(`${group.key}||${typeGroup.type}`) ? "▾" : "▸" }}</span>
                        {{ typeGroup.type }} ({{ typeGroup.total }})
                      </button>
                    </td>
                  </tr>
                  <template v-if="expandedTypes.has(`${group.key}||${typeGroup.type}`)">
                    <template v-for="i in typeGroup.rows" :key="i.product_id">
                      <tr :class="{ rowActive: editingId === i.product_id || editingMasterId === i.product_id || stockingId === i.product_id || confirmDeleteId === i.product_id }">
                        <td class="mono">{{ i.sku }}</td>
                        <td>
                          <div class="strong">{{ i.name }}</div>
                          <div class="muted">{{ i.size }}</div>
                        </td>
                        <td style="text-align: right">
                          <template v-if="priceEditMode">
                            <input
                              v-model.number="priceDrafts[i.product_id]"
                              class="mb-input priceInput"
                              type="number"
                              min="0"
                              step="1"
                              @input="syncPriceDraft(i.product_id)"
                            />
                          </template>
                          <template v-else>Rp {{ rupiah(i.sell_price) }}</template>
                        </td>
                        <td style="text-align: right">{{ i.qty_on_hand }}</td>
                        <td style="text-align: right">
                          <div class="btnGroup">
                            <button
                              class="mb-btn rowActionBtn"
                              :class="{ rowActionActive: editingId === i.product_id }"
                              type="button"
                              :disabled="priceEditMode"
                              title="Ubah harga jual produk ini"
                              @click="editingId === i.product_id ? cancelEdit() : startEdit(i)"
                            >Edit Harga</button>
                            <button
                              class="mb-btn rowActionBtn"
                              :class="{ rowActionActive: stockingId === i.product_id }"
                              type="button"
                              title="Tambah atau kurangi stok produk ini"
                              @click="stockingId === i.product_id ? cancelStock() : startStock(i)"
                            >Ubah Stok</button>
                            <button
                              class="mb-btn rowActionBtn"
                              :class="{ rowActionActive: editingMasterId === i.product_id }"
                              type="button"
                              title="Edit nama, ukuran, SKU, dan tipe produk ini"
                              @click="editingMasterId === i.product_id ? cancelEditMaster() : startEditMaster(i)"
                            >Edit Info</button>
                            <button
                              class="mb-btn rowActionBtn rowActionDanger"
                              type="button"
                              :disabled="removingId === i.product_id"
                              title="Hapus produk ini dari toko"
                              @click="confirmDeleteId === i.product_id ? cancelDelete() : promptDelete(i.product_id)"
                            >
                              {{ removingId === i.product_id ? "Menghapus..." : confirmDeleteId === i.product_id ? "Batal" : "Hapus" }}
                            </button>
                          </div>
                        </td>
                      </tr>
                      <tr v-if="confirmDeleteId === i.product_id">
                        <td :colspan="5" class="inlinePanelCell">
                          <div class="inlinePanel inlinePanelDanger">
                            <div class="inlinePanelHeader">
                              <span class="inlinePanelIcon">⚠</span>
                              <span>Hapus produk dari toko</span>
                            </div>
                            <div class="inlinePanelBody">
                              <p class="inlinePanelDesc">Apakah kamu yakin ingin menghapus <strong>{{ i.name }}{{ i.size ? ` — ${i.size}` : "" }}</strong> dari toko? Stok dan riwayat harga akan ikut terhapus.</p>
                              <div class="inlinePanelActions">
                                <button class="mb-btnDanger" type="button" :disabled="removingId === i.product_id" @click="removeFromStore(i.product_id)">
                                  {{ removingId === i.product_id ? "Menghapus..." : "Ya, Hapus dari Toko" }}
                                </button>
                                <button class="mb-btn" type="button" @click="cancelDelete">Batal</button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr v-if="editingId === i.product_id && !priceEditMode">
                        <td :colspan="5" class="inlinePanelCell">
                          <div class="inlinePanel">
                            <div class="inlinePanelHeader">
                              <span>Edit Harga Jual</span>
                              <span class="inlinePanelMeta">{{ i.name }}{{ i.size ? ` — ${i.size}` : "" }}</span>
                            </div>
                            <div class="inlinePanelBody">
                              <div class="inlinePanelFields">
                                <label class="field smallField">
                                  <span>Harga Jual Baru (Rp)</span>
                                  <input v-model.number="editSellPrice" class="mb-input" type="number" min="0" />
                                  <span class="fieldHint">Sebelumnya: Rp {{ rupiah(i.sell_price) }}</span>
                                </label>
                              </div>
                              <div class="inlinePanelActions">
                                <button class="mb-btnPrimary" type="button" :disabled="editLoading" @click="saveEdit(i.product_id)">
                                  {{ editLoading ? "Menyimpan..." : "Simpan Harga" }}
                                </button>
                                <button class="mb-btn" type="button" :disabled="editLoading" @click="cancelEdit">Batal</button>
                                <span v-if="editError" class="errorInline">{{ editError }}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr v-if="editingMasterId === i.product_id">
                        <td :colspan="5" class="inlinePanelCell">
                          <div class="inlinePanel">
                            <div class="inlinePanelHeader">
                              <span>Edit Info Produk</span>
                              <span class="inlinePanelMeta">{{ i.brand }} — {{ i.product_type }}</span>
                            </div>
                            <div class="inlinePanelBody">
                              <div class="inlinePanelFields">
                                <label class="field smallField">
                                  <span>Nama Model</span>
                                  <input v-model="masterName" class="mb-input" placeholder="Contoh: Victra S98 CT" />
                                </label>
                                <label class="field smallField">
                                  <span>Ukuran / Varian</span>
                                  <input v-model="masterSize" class="mb-input" placeholder="Contoh: 110/70-12, 1L..." />
                                </label>
                                <label class="field smallField">
                                  <span>SKU</span>
                                  <input v-model="masterSku" class="mb-input" />
                                </label>
                                <label class="field smallField">
                                  <span>Tipe Produk</span>
                                  <select v-model="masterProductType" class="mb-input">
                                    <option v-for="t in existingStoreTypes" :key="t" :value="t">{{ t }}</option>
                                    <option value="__custom__">+ Tipe baru...</option>
                                  </select>
                                </label>
                                <label v-if="masterProductType === '__custom__'" class="field smallField">
                                  <span>Nama Tipe Baru</span>
                                  <input v-model="masterProductTypeCustom" class="mb-input" placeholder="Contoh: Oli Gardan" />
                                </label>
                              </div>
                              <div class="inlinePanelActions">
                                <button
                                  class="mb-btnPrimary"
                                  type="button"
                                  :disabled="masterEditLoading"
                                  @click="saveEditMaster(i.product_id)"
                                >
                                  {{ masterEditLoading ? "Menyimpan..." : "Simpan Info" }}
                                </button>
                                <button class="mb-btn" type="button" :disabled="masterEditLoading" @click="cancelEditMaster">
                                  Batal
                                </button>
                                <span v-if="masterEditError" class="errorInline">{{ masterEditError }}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr v-if="stockingId === i.product_id">
                        <td :colspan="5" class="inlinePanelCell">
                          <div class="inlinePanel">
                            <div class="inlinePanelHeader">
                              <span>Ubah Stok</span>
                              <span class="inlinePanelMeta">{{ i.name }}{{ i.size ? ` — ${i.size}` : "" }} &nbsp;·&nbsp; Stok saat ini: <strong>{{ i.qty_on_hand }}</strong></span>
                            </div>
                            <div class="inlinePanelBody">
                              <div class="inlinePanelFields">
                                <label class="field smallField">
                                  <span>Perubahan Qty</span>
                                  <input v-model.number="stockQtyDelta" class="mb-input" type="number" step="1" placeholder="Contoh: +10 atau -5" />
                                  <span class="fieldHint">Positif = tambah stok, negatif = kurangi stok</span>
                                </label>
                                <label class="field smallField">
                                  <span>Harga Beli / Unit (Rp)</span>
                                  <input v-model.number="stockUnitCost" class="mb-input" type="number" min="0" step="1" />
                                  <span class="fieldHint">Hanya berlaku saat menambah stok (+)</span>
                                </label>
                                <label class="field noteField">
                                  <span>Catatan (opsional)</span>
                                  <input v-model="stockNote" class="mb-input" placeholder="Contoh: Pembelian dari supplier X" />
                                </label>
                              </div>
                              <div class="inlinePanelActions">
                                <button class="mb-btnPrimary" type="button" :disabled="stockLoading" @click="submitStock(i.product_id)">
                                  {{ stockLoading ? "Menyimpan..." : "Simpan Perubahan Stok" }}
                                </button>
                                <button class="mb-btn" type="button" :disabled="stockLoading" @click="cancelStock">Batal</button>
                                <span v-if="stockError" class="errorInline">{{ stockError }}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </template>
                  </template>
                </template>
              </template>
            </template>
          </tbody>
        </table>
      </div>

      <div v-else-if="!isLoading" class="empty">Tidak ada data.</div>
      <div v-if="items.length" class="paginationBar">
        <div class="muted">{{ items.length }} produk</div>
      </div>
      <p v-if="removeError" class="error">{{ removeError }}</p>
    </section>
  </div>

  <Teleport to="body">
    <div class="toastStack">
      <TransitionGroup name="toast">
        <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type === 'error' ? 'toastError' : 'toastSuccess'">
          {{ t.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.page {
  display: grid;
  gap: 16px;
}
.row {
  display: flex;
  gap: 12px;
  align-items: end;
  justify-content: space-between;
  flex-wrap: wrap;
}
.rowActions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.field {
  display: grid;
  gap: 6px;
  font-size: 12px;
  flex: 1;
  min-width: 240px;
}
.tabs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.tab {
  height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
  color: var(--mb-text);
  cursor: pointer;
}
.tab.active {
  border-color: rgba(52, 199, 89, 0.9);
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.18);
}
.form {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}
.actions {
  grid-column: 1 / -1;
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.master {
  margin-top: 14px;
}
.masterFilters {
  display: flex;
  gap: 12px;
  align-items: end;
  flex-wrap: wrap;
}
.masterFilters .field {
  flex: 1;
  min-width: 200px;
}
.derivedBar {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.derivedHint {
  font-size: 12px;
  color: var(--mb-muted);
}
.required {
  color: var(--mb-danger);
}
.masterGrid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}
.masterPick {
  text-align: left;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
  border-radius: 14px;
  padding: 12px 14px;
  display: grid;
  gap: 10px;
  cursor: pointer;
}
.masterPick:hover {
  border-color: rgba(52, 199, 89, 0.55);
}
.masterPick.active {
  border-color: rgba(52, 199, 89, 0.9);
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.18);
}
.mTitle {
  font-weight: 900;
}
.mSub {
  font-size: 12px;
  color: var(--mb-muted);
}
.attachCard {
  margin-top: 12px;
  border: 1px solid var(--mb-border2);
  border-radius: 14px;
  padding: 12px 14px;
  background: var(--mb-surface2);
}
.attachTitle {
  font-weight: 900;
}
.attachSub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--mb-muted);
}
.attachForm {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
.tableWrap {
  margin-top: 12px;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}
.paginationBar {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.groupRow td {
  background: rgba(52, 199, 89, 0.08);
  border-bottom: 1px solid rgba(52, 199, 89, 0.25);
}
.groupToggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  padding: 6px 4px;
  font-weight: 800;
  font-size: 12px;
  color: var(--mb-text);
  cursor: pointer;
  text-align: left;
}
.typeRow td {
  background: rgba(52, 199, 89, 0.04);
  border-bottom: 1px solid rgba(52, 199, 89, 0.18);
}
.typeToggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  padding: 6px 16px;
  font-weight: 700;
  font-size: 12px;
  color: var(--mb-text);
  cursor: pointer;
  text-align: left;
}
.chevron {
  width: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.groupTitle {
  font-weight: 800;
  font-size: 12px;
  color: var(--mb-text);
}
th,
td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--mb-table-border);
}
th {
  text-align: left;
  color: var(--mb-muted);
  font-weight: 700;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
}
.strong {
  font-weight: 800;
}
.muted {
  margin-top: 4px;
  font-size: 12px;
  color: var(--mb-muted);
}
.editRow {
  display: flex;
  gap: 10px;
  align-items: end;
  flex-wrap: wrap;
  padding: 10px 0;
}
.rowActive td {
  background: rgba(52, 199, 89, 0.04);
}
.rowActionBtn {
  font-size: 12px;
  white-space: nowrap;
}
.rowActionActive {
  border-color: rgba(52, 199, 89, 0.8);
  background: rgba(52, 199, 89, 0.1);
}
.rowActionDanger {
  border-color: rgba(255, 59, 48, 0.4);
  color: var(--mb-danger);
}
.rowActionDanger:hover {
  background: rgba(255, 59, 48, 0.08);
}
.inlinePanelCell {
  padding: 0 !important;
  border-bottom: none !important;
}
.inlinePanel {
  border-left: 3px solid rgba(52, 199, 89, 0.7);
  background: rgba(52, 199, 89, 0.04);
  border-bottom: 1px solid var(--mb-table-border);
}
.inlinePanelDanger {
  border-left-color: rgba(255, 59, 48, 0.7);
  background: rgba(255, 59, 48, 0.04);
}
.inlinePanelHeader {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 12px;
  font-weight: 700;
}
.inlinePanelIcon {
  font-size: 14px;
}
.inlinePanelMeta {
  font-weight: 400;
  color: var(--mb-muted);
}
.inlinePanelBody {
  padding: 12px 14px;
}
.inlinePanelFields {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: end;
}
.inlinePanelFields .field {
  min-width: 0;
}
.inlinePanelActions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.inlinePanelDesc {
  font-size: 13px;
  margin: 0 0 12px;
  color: var(--mb-text);
}
.fieldHint {
  font-size: 11px;
  color: var(--mb-muted);
  margin-top: 2px;
}
.smallField {
  min-width: 240px;
  flex: 0 1 320px;
}
.noteField {
  min-width: 240px;
  flex: 1 1 320px;
}
.priceInput {
  width: 140px;
  margin-left: auto;
  text-align: right;
}
.btnGroup {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--mb-muted);
}
.empty {
  margin-top: 12px;
  border-radius: 12px;
  border: 1px dashed var(--mb-border2);
  padding: 14px;
  font-size: 13px;
  color: var(--mb-muted);
}
.error {
  margin: 12px 0 0;
  color: var(--mb-danger);
  font-size: 12px;
}
.errorInline {
  font-size: 12px;
  color: var(--mb-danger);
}
.deleteConfirmRow {
  background: rgba(255, 59, 48, 0.06);
}
.deleteConfirmLabel {
  font-size: 13px;
  color: var(--mb-danger);
}
.deleteTypeBar {
  margin-top: 6px;
  display: flex;
  gap: 8px;
}
.deleteTypeBtn {
  border-color: rgba(255, 59, 48, 0.5);
  color: var(--mb-danger);
}
.deleteTypeBtn:hover {
  background: rgba(255, 59, 48, 0.1);
}
.deleteTypeConfirm {
  margin-top: 8px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 59, 48, 0.07);
  border: 1px solid rgba(255, 59, 48, 0.25);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.deleteTypeActions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.createForm {
  margin-top: 14px;
  display: grid;
  gap: 12px;
}
.formSection {
  border: 1px solid var(--mb-border2);
  border-radius: 12px;
  overflow: hidden;
}
.formSectionTitle {
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid var(--mb-border2);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--mb-muted);
}
.formSectionBody {
  padding: 14px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.skuSection {
  grid-template-columns: 1fr;
}
.skuFullField {
  min-width: 0;
}
.chipList {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.chip {
  height: 28px;
  padding: 0 12px;
  border-radius: 20px;
  border: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
  color: var(--mb-text);
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  white-space: nowrap;
}
.chip:hover {
  border-color: rgba(52, 199, 89, 0.6);
}
.chip.active {
  border-color: rgba(52, 199, 89, 0.9);
  background: rgba(52, 199, 89, 0.12);
  box-shadow: 0 0 0 2px rgba(52, 199, 89, 0.18);
}
.typeNewBadge {
  margin-top: 4px;
  font-size: 12px;
  color: var(--mb-muted);
}
.typeNewBadge strong {
  color: var(--mb-text);
}
.skuPreview {
  margin-top: 4px;
  font-size: 11px;
  color: var(--mb-muted);
}
.skuPreview code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  color: var(--mb-text);
  opacity: 0.7;
  font-size: 11px;
}
.fieldOptional {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--mb-muted);
}
</style>

<style>
.toastStack {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}
.toast {
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  pointer-events: all;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}
.toastSuccess {
  background: rgba(52, 199, 89, 0.92);
  color: #fff;
}
.toastError {
  background: rgba(255, 59, 48, 0.92);
  color: #fff;
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.28s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
