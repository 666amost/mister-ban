<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted } from "vue"

type ProductItem = {
  product_id: string
  sku: string
  name: string
  size: string
  brand: string
  sell_price: number
  qty_on_hand: number
}

type SaleItemDetail = {
  type: "product"
  product_id: string
  sku: string
  brand: string
  name: string
  size: string
  qty: number
  price: number
  line_total: number
}

type CustomItemDetail = {
  type: "custom"
  item_name: string
  qty: number
  price: number
  line_total: number
}

type SalePaymentDetail = {
  payment_type: string
  amount: number
}

type SaleExpenseDetail = {
  item_name: string
  amount: number
}

type SaleRow = {
  id: string
  sale_date: string
  payment_type: string
  customer_plate_no: string
  subtotal: number
  discount: number
  service_fee: number
  total: number
  created_at: string
  printed_first_at?: string | null
  items?: SaleItemDetail[]
  custom_items?: CustomItemDetail[]
  payments?: SalePaymentDetail[]
  expenses?: SaleExpenseDetail[]
  expense_total?: number
}

type CustomItem = { item_name: string; qty: number; price: number }

type PaymentType = "CASH" | "TRANSFER" | "QRIS" | "DEBIT" | "CREDIT" | "TEMPO"
type ExpenseItem = { item_name: string; amount: number }
type PaymentItem = { payment_type: PaymentType; amount: number }
type InputMode = "sale" | "expense" | "receipt"
type StockReceiptItem = { item_name: string; qty: number; unit_label: string }
type StockReceiptRow = {
  id: string
  receipt_date: string
  created_at: string
  total_qty: number
  entry_count: number
  items: StockReceiptItem[]
}
type StockReceiptParseResult = { items: StockReceiptItem[]; errors: string[] }

type SalesQtySummary = {
  ban_qty: number
  oli_qty: number
  kampas_qty: number
  total_qty: number
}

type SalesDailySummary = {
  total_transactions: number
  omzet: number
  pengeluaran: number
  sisa_omzet: number
  non_tunai: number
  tunai: number
  qris: number
  debit: number
  transfer: number
  credit: number
}

const defaultDailySummary = (): SalesDailySummary => ({
  total_transactions: 0,
  omzet: 0,
  pengeluaran: 0,
  sisa_omzet: 0,
  non_tunai: 0,
  tunai: 0,
  qris: 0,
  debit: 0,
  transfer: 0,
  credit: 0,
})

function todayIsoDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value
  if (!year || !month || !day) return new Date().toISOString().slice(0, 10)
  return `${year}-${month}-${day}`
}

const me = useMe()

const saleDate = ref(todayIsoDate())
const plateNo = ref("")
const paymentType = ref<PaymentType>("CASH")
const isSplitPayment = ref(false)
const payments = ref<PaymentItem[]>([])
const discount = ref(0)
const customItems = ref<CustomItem[]>([])
const expenses = ref<ExpenseItem[]>([])
const stockReceiptRawInput = ref("")

const newCustomName = ref("")
const newCustomQty = ref(1)
const newCustomPrice = ref(0)
const showCustomForm = ref(false)

const newExpenseName = ref("")
const newExpenseAmount = ref(0)
const showExpenseForm = ref(false)

const search = ref("")
const searchLoading = ref(false)
const searchRan = ref(false)
const products = ref<ProductItem[]>([])
const selected = ref<Array<{ product: ProductItem; qty: number }>>([])
const dropdownOpen = ref(false)

const salesLoading = ref(false)
const sales = ref<SaleRow[]>([])
const stockReceipts = ref<StockReceiptRow[]>([])
const qtySummary = ref<SalesQtySummary>({ ban_qty: 0, oli_qty: 0, kampas_qty: 0, total_qty: 0 })
const dailySummary = ref<SalesDailySummary>(defaultDailySummary())
const historyQuery = ref("")
const lastHistoryQuery = ref<string>("")
const searchAllDates = ref(false)

const submitLoading = ref(false)
const errorMessage = ref<string | null>(null)
const lastSaleId = ref<string | null>(null)

const isInitialLoad = ref(true)
const activeTab = ref<"input" | "history">("input")
const showSuccessSheet = ref(false)
const inputModeSheetOpen = ref(false)

const inputTabButtonRef = ref<HTMLButtonElement | null>(null)
const inputModeActiveTrigger = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const stockReceiptInputRef = ref<HTMLTextAreaElement | null>(null)
const inputModePopoverStyle = ref<Record<string, string>>({})

const isAdmin = computed(() => me.user.value?.role === "ADMIN")
const expenseOnlyMode = ref(false)
const isExpenseOnly = computed(() => expenseOnlyMode.value)
const stockReceiptMode = ref(false)
const isStockReceiptOnly = computed(() => stockReceiptMode.value)
const isStandardSale = computed(() => !expenseOnlyMode.value && !stockReceiptMode.value)
const currentInputMode = computed<InputMode>(() => {
  if (isStockReceiptOnly.value) return "receipt"
  if (isExpenseOnly.value) return "expense"
  return "sale"
})
const currentInputModeText = computed(() => {
  if (currentInputMode.value === "expense") return "Input Pengeluaran"
  if (currentInputMode.value === "receipt") return "Input Barang Masuk"
  return "Input Sales"
})
const stockReceiptPlaceholder = [
  "Contoh:",
  "15 pcs Maxxis",
  "1 pcs Oli",
  "10 ban Swallow",
].join("\n")

const editOpen = ref(false)
const editSaleId = ref<string | null>(null)
const editIsExpenseOnly = ref(false)
const editSaleDate = ref("")
const editPlateNo = ref("")
const editPaymentType = ref<PaymentType>("CASH")
const editIsSplitPayment = ref(false)
const editPayments = ref<PaymentItem[]>([])
const editDiscount = ref(0)
const editItems = ref<Array<{ product_id: string; sku: string; brand: string; name: string; size: string; qty: number; price: number }>>([])
const editOriginalItems = ref<Array<{ product_id: string; qty: number }>>([])
const editCustomItems = ref<CustomItem[]>([])
const editExpenses = ref<ExpenseItem[]>([])
const editSaving = ref(false)
const editError = ref<string | null>(null)

const deleteConfirmOpen = ref(false)
const deleteSaleId = ref<string | null>(null)
const deleteSaleLabel = ref("")
const deleteLoading = ref(false)
const deleteError = ref<string | null>(null)

const deleteStockReceiptConfirmOpen = ref(false)
const deleteStockReceiptId = ref<string | null>(null)
const deleteStockReceiptLabel = ref("")
const deleteStockReceiptLoading = ref(false)
const deleteStockReceiptError = ref<string | null>(null)

const detailOpen = ref(false)
const detailSale = ref<SaleRow | null>(null)

const editSearch = ref("")
const editSearchLoading = ref(false)
const editSearchRan = ref(false)
const editProducts = ref<ProductItem[]>([])
const editDropdownOpen = ref(false)

function rupiah(value: number) {
  return value.toLocaleString("id-ID")
}

function statusMessage(error: unknown) {
  if (!error || typeof error !== "object") return null
  const e = error as Record<string, unknown>
  return typeof e.statusMessage === "string" ? e.statusMessage : null
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

function normalizeStockReceiptUnitLabel(value: string) {
  const unit = value.trim().toLowerCase()
  if (!unit) return "pcs"
  if (["pc", "pcs", "piece", "pieces"].includes(unit)) return "pcs"
  return unit
}

function parseStockReceiptInput(value: string): StockReceiptParseResult {
  const grouped = new Map<string, StockReceiptItem>()
  const errors: string[] = []
  const lines = value.split(/\r?\n/)
  const supportedUnits = new Set(["pc", "pcs", "piece", "pieces", "ban", "botol", "dus", "unit"])

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim()
    if (!line) return

    const cleaned = line.replace(/^[=+]+\s*/, "")
    const tokens = cleaned.split(/\s+/)
    const qty = Number(tokens[0] ?? "")
    if (!Number.isInteger(qty) || qty <= 0) {
      errors.push(`Baris ${index + 1}: qty harus angka bulat lebih dari 0`)
      return
    }

    let startIndex = 1
    let unitLabel = "pcs"
    const candidateUnit = (tokens[1] ?? "").toLowerCase()
    if (supportedUnits.has(candidateUnit)) {
      unitLabel = normalizeStockReceiptUnitLabel(candidateUnit)
      startIndex = 2
    }

    const itemName = tokens.slice(startIndex).join(" ").trim().replace(/\s+/g, " ")
    if (!itemName) {
      errors.push(`Baris ${index + 1}: nama barang wajib diisi`)
      return
    }

    const key = `${itemName.toLowerCase()}::${unitLabel}`
    const existing = grouped.get(key)
    if (existing) {
      existing.qty += qty
      return
    }

    grouped.set(key, {
      item_name: itemName,
      qty,
      unit_label: unitLabel,
    })
  })

  return {
    items: Array.from(grouped.values()),
    errors,
  }
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

function saleItemLabel(i: SaleItemDetail | CustomItemDetail) {
  if (i.type === "custom") {
    return `${i.item_name} x${i.qty}`
  }
  const base = `${productDisplayName(i.brand, i.name)} ${i.size}`.replace(/\s+/g, " ").trim()
  return `${base} x${i.qty}`
}

function saleItemPreview(sale: SaleRow, maxLines = 2) {
  const allItems: (SaleItemDetail | CustomItemDetail)[] = [
    ...(sale.items ?? []),
    ...(sale.custom_items ?? []),
  ]
  if (allItems.length === 0) return { lines: [] as string[], more: 0 }
  const lines = allItems.slice(0, maxLines).map(saleItemLabel)
  const more = Math.max(0, allItems.length - lines.length)
  return { lines, more }
}

function paymentLabel(sale: SaleRow) {
  const ps = sale.payments ?? []
  if (ps.length > 1) return ps.map((p) => p.payment_type).join(" + ")
  return String(ps[0]?.payment_type ?? sale.payment_type)
}

function salePlateText(sale: SaleRow) {
  return sale.customer_plate_no?.trim() || "Tanpa plat nomor"
}

function saleItemTitle(i: SaleItemDetail | CustomItemDetail) {
  if (i.type === "custom") return i.item_name
  return `${productDisplayName(i.brand, i.name)} ${i.size}`.replace(/\s+/g, " ").trim()
}

function isExpenseOnlySale(sale: SaleRow) {
  const hasProduct = (sale.items?.length ?? 0) > 0
  const hasCustom = (sale.custom_items?.length ?? 0) > 0
  const hasExpense = (sale.expense_total ?? 0) > 0 || (sale.expenses?.length ?? 0) > 0
  return !hasProduct && !hasCustom && hasExpense
}

function saleDisplayTotal(sale: SaleRow) {
  if (!isExpenseOnlySale(sale)) return sale.total
  if (typeof sale.expense_total === "number") return sale.expense_total
  return (sale.expenses ?? []).reduce((sum, e) => sum + (e.amount || 0), 0)
}

function hhmm(value: string) {
  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  })
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  })
}

function formatDate(value: string) {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) {
    const year = Number(m[1])
    const month = Number(m[2])
    const day = Number(m[3])
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      timeZone: "Asia/Jakarta",
    })
  }
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Jakarta",
  })
}

const salePreviewById = computed(() => {
  const map = new Map<string, { lines: string[]; more: number }>()
  for (const s of sales.value) map.set(s.id, saleItemPreview(s, 2))
  return map
})

function salePreview(s: SaleRow) {
  return salePreviewById.value.get(s.id) ?? { lines: [], more: 0 }
}

function stockReceiptDeleteLabel(receipt: StockReceiptRow) {
  const firstItem = receipt.items[0]
  const baseLabel = firstItem
    ? `${firstItem.qty} ${firstItem.unit_label} ${firstItem.item_name}`
    : `Barang masuk ${formatDate(receipt.receipt_date)}`

  return `${baseLabel} • ${formatDate(receipt.receipt_date)} ${hhmm(receipt.created_at)} WIB`
}

const parsedStockReceipt = computed<StockReceiptParseResult>(() => parseStockReceiptInput(stockReceiptRawInput.value))
const parsedStockReceiptItems = computed<StockReceiptItem[]>(() => parsedStockReceipt.value.items)
const stockReceiptParseErrors = computed<string[]>(() => parsedStockReceipt.value.errors)
const stockReceiptTotalQty = computed(() => parsedStockReceiptItems.value.reduce((sum, item) => sum + item.qty, 0))

async function runSearch() {
  searchLoading.value = true
  errorMessage.value = null
  try {
    const res = await $fetch<{ items: ProductItem[] }>("/api/products", { 
      query: { q: search.value, limit: 50 },
      headers: { Accept: 'application/json' },
    })
    products.value = res.items
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal mencari produk"
    console.error('Product search error:', error)
  } finally {
    searchLoading.value = false
    searchRan.value = true
  }
}

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

watch(search, (v) => {
  const term = v.trim()
  dropdownOpen.value = term.length > 0
  searchRan.value = false
  if (term.length < 2) {
    products.value = []
    return
  }

  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    runSearch()
  }, 300)
})

function addProduct(p: ProductItem) {
  if (p.qty_on_hand <= 0) return
  const existing = selected.value.find((x) => x.product.product_id === p.product_id)
  if (existing) {
    existing.qty += 1
    search.value = ""
    products.value = []
    dropdownOpen.value = false
    return
  }
  selected.value.push({ product: p, qty: 1 })
  search.value = ""
  products.value = []
  dropdownOpen.value = false
}

function removeProduct(productId: string) {
  selected.value = selected.value.filter((x) => x.product.product_id !== productId)
}

function incrementQty(productId: string) {
  const item = selected.value.find((x) => x.product.product_id === productId)
  if (item) item.qty += 1
}

function decrementQty(productId: string) {
  const item = selected.value.find((x) => x.product.product_id === productId)
  if (item && item.qty > 1) item.qty -= 1
}

function addCustomItem() {
  if (!newCustomName.value.trim() || newCustomQty.value < 1 || newCustomPrice.value < 0) return
  customItems.value.push({
    item_name: newCustomName.value.trim(),
    qty: newCustomQty.value,
    price: newCustomPrice.value,
  })
  newCustomName.value = ""
  newCustomQty.value = 1
  newCustomPrice.value = 0
  showCustomForm.value = false
}

function removeCustomItem(idx: number) {
  customItems.value.splice(idx, 1)
}

async function loadSales() {
  salesLoading.value = true
  errorMessage.value = null
  try {
    const query: Record<string, string | undefined> = {
      limit: "50",
      q: lastHistoryQuery.value || undefined,
    }
    if (isAdmin.value && searchAllDates.value) {
      query.all_dates = "true"
    }
    const [salesRes, stockReceiptRes] = await Promise.all([
      $fetch<{ items: SaleRow[]; qty_summary: SalesQtySummary; daily_summary?: SalesDailySummary }>("/api/sales", {
        query,
        headers: { Accept: 'application/json' },
      }),
      $fetch<{ items: StockReceiptRow[] }>("/api/sales/stock-receipts", {
        query,
        headers: { Accept: 'application/json' },
      }),
    ])
    sales.value = salesRes.items
    stockReceipts.value = stockReceiptRes.items
    qtySummary.value = salesRes.qty_summary ?? { ban_qty: 0, oli_qty: 0, kampas_qty: 0, total_qty: 0 }
    dailySummary.value = salesRes.daily_summary ?? defaultDailySummary()
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal memuat sales"
    console.error('Sales load error:', error)
  } finally {
    salesLoading.value = false
    isInitialLoad.value = false
  }
}

onMounted(async () => {
  await loadSales()
})

onMounted(() => {
  if (!import.meta.client) return
  window.addEventListener("resize", syncInputModePopoverPosition)
  window.addEventListener("scroll", syncInputModePopoverPosition, true)
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener("resize", syncInputModePopoverPosition)
  window.removeEventListener("scroll", syncInputModePopoverPosition, true)
})

let historyDebounceTimer: ReturnType<typeof setTimeout> | null = null

watch(historyQuery, (v) => {
  if (activeTab.value !== "history") return
  const term = v.trim()
  if (historyDebounceTimer) clearTimeout(historyDebounceTimer)
  historyDebounceTimer = setTimeout(() => {
    lastHistoryQuery.value = term
    loadSales()
  }, 300)
})

const productSubtotal = computed(() => selected.value.reduce((sum, x) => sum + x.qty * x.product.sell_price, 0))
const customSubtotal = computed(() => customItems.value.reduce((sum, x) => sum + x.qty * x.price, 0))
const subtotalPreview = computed(() => productSubtotal.value + customSubtotal.value)
const totalPreview = computed(() => subtotalPreview.value - discount.value)
const itemCount = computed(() => selected.value.reduce((sum, x) => sum + x.qty, 0) + customItems.value.reduce((sum, x) => sum + x.qty, 0))

const paymentTotal = computed(() => payments.value.reduce((sum, p) => sum + (p.amount || 0), 0))
const paymentDiff = computed(() => totalPreview.value - paymentTotal.value)

const expenseTotal = computed(() => expenses.value.reduce((sum, e) => sum + (e.amount || 0), 0))
const bottomValueText = computed(() => {
  if (isStockReceiptOnly.value) return `${stockReceiptTotalQty.value} qty`
  if (isExpenseOnly.value) return `Rp ${rupiah(expenseTotal.value)}`
  return `Rp ${rupiah(totalPreview.value)}`
})
const submitDisabled = computed(() => {
  if (submitLoading.value) return true
  if (isStockReceiptOnly.value) {
    return parsedStockReceiptItems.value.length === 0 || stockReceiptParseErrors.value.length > 0
  }
  if (isExpenseOnly.value) return expenses.value.length === 0
  if (!plateNo.value.trim()) return true
  if (selected.value.length === 0 && customItems.value.length === 0) return true
  if (isSplitPayment.value && paymentDiff.value !== 0) return true
  return false
})

function enableSplitPayment() {
  isSplitPayment.value = true
  if (payments.value.length === 0) {
    payments.value = [{ payment_type: paymentType.value, amount: totalPreview.value }]
  }
}

function disableSplitPayment() {
  isSplitPayment.value = false
  payments.value = []
}

function onSplitPaymentToggle(e: Event) {
  const checked = (e.target as HTMLInputElement | null)?.checked ?? false
  if (checked) enableSplitPayment()
  else disableSplitPayment()
}

function setInputMode(mode: InputMode) {
  errorMessage.value = null
  dropdownOpen.value = false
  products.value = []
  expenseOnlyMode.value = mode === "expense"
  stockReceiptMode.value = mode === "receipt"
}

function closeInputModeSheet() {
  inputModeSheetOpen.value = false
}

function updateInputModePopoverPosition() {
  if (!import.meta.client) return

  const trigger = inputModeActiveTrigger.value ?? inputTabButtonRef.value
  const maxWidth = Math.min(360, window.innerWidth - 24)
  if (!trigger) {
    inputModePopoverStyle.value = {
      top: "72px",
      left: "12px",
      width: `${maxWidth}px`,
      "--mode-popover-origin-x": "28px",
    }
    return
  }

  const rect = trigger.getBoundingClientRect()
  const maxLeft = Math.max(12, window.innerWidth - maxWidth - 12)
  const left = Math.min(Math.max(12, rect.left), maxLeft)
  const originX = Math.min(Math.max(20, rect.left - left + rect.width / 2), maxWidth - 20)

  inputModePopoverStyle.value = {
    top: `${rect.bottom + 10}px`,
    left: `${left}px`,
    width: `${maxWidth}px`,
    "--mode-popover-origin-x": `${originX}px`,
  }
}

async function openInputModeSheet(event?: MouseEvent) {
  activeTab.value = "input"
  inputModeSheetOpen.value = true
  if (event?.currentTarget instanceof HTMLElement) {
    inputModeActiveTrigger.value = event.currentTarget
  }
  await nextTick()
  updateInputModePopoverPosition()
}

async function selectInputMode(mode: InputMode) {
  setInputMode(mode)
  closeInputModeSheet()

  await nextTick()
  if (mode === "sale") {
    searchInputRef.value?.focus()
    return
  }
  if (mode === "receipt") {
    stockReceiptInputRef.value?.focus()
  }
}

function syncInputModePopoverPosition() {
  if (!inputModeSheetOpen.value) return
  updateInputModePopoverPosition()
}

function addPaymentRow() {
  if (payments.value.length >= 6) return
  const used = new Set(payments.value.map((p) => p.payment_type))
  const options: PaymentType[] = ["CASH", "QRIS", "TRANSFER", "DEBIT", "CREDIT", "TEMPO"]
  const next = options.find((o) => !used.has(o)) ?? "CASH"
  payments.value.push({ payment_type: next, amount: 0 })
}

function removePaymentRow(idx: number) {
  payments.value.splice(idx, 1)
  if (payments.value.length === 0) {
    payments.value = [{ payment_type: paymentType.value, amount: totalPreview.value }]
  }
}

function fillPaymentRemaining() {
  if (payments.value.length === 0) return
  const idx = payments.value.length - 1
  const last = payments.value[idx]
  if (!last) return
  const otherSum = payments.value.slice(0, idx).reduce((sum, p) => sum + (p.amount || 0), 0)
  const remaining = totalPreview.value - otherSum
  payments.value[idx] = { payment_type: last.payment_type, amount: Math.max(0, remaining) }
}

function addExpense() {
  const name = newExpenseName.value.trim()
  if (!name) return
  if (newExpenseAmount.value <= 0) return
  expenses.value.push({ item_name: name, amount: newExpenseAmount.value })
  newExpenseName.value = ""
  newExpenseAmount.value = 0
  showExpenseForm.value = false
}

function removeExpense(idx: number) {
  expenses.value.splice(idx, 1)
}

async function submit() {
  errorMessage.value = null
  lastSaleId.value = null
  if (isStockReceiptOnly.value) {
    if (stockReceiptParseErrors.value.length > 0) {
      errorMessage.value = stockReceiptParseErrors.value[0] ?? "Format barang masuk tidak valid"
      return
    }
    if (parsedStockReceiptItems.value.length === 0) {
      errorMessage.value = "Minimal 1 baris barang masuk"
      return
    }
  }

  const expenseOnly = isExpenseOnly.value

  if (isStockReceiptOnly.value) {
    submitLoading.value = true
    try {
      await $fetch<{ receipt_id: string }>("/api/sales/stock-receipts", {
        method: "POST",
        body: {
          receipt_date: saleDate.value || undefined,
          items: parsedStockReceiptItems.value,
        },
      })
      stockReceiptRawInput.value = ""
      historyQuery.value = ""
      lastHistoryQuery.value = ""
      activeTab.value = "history"
      await loadSales()
    } catch (error) {
      errorMessage.value = statusMessage(error) ?? "Gagal simpan barang masuk"
    } finally {
      submitLoading.value = false
    }
    return
  }

  if (expenseOnly) {
    if (expenses.value.length === 0) {
      errorMessage.value = "Minimal 1 item pengeluaran"
      return
    }
  } else {
    if (!plateNo.value.trim()) {
      errorMessage.value = "Plat nomor wajib diisi"
      return
    }
    if (selected.value.length === 0 && customItems.value.length === 0) {
      errorMessage.value = "Pilih minimal 1 item produk atau custom item"
      return
    }
    if (isSplitPayment.value) {
      const used = new Set<string>()
      for (const p of payments.value) {
        if (!p.payment_type) {
          errorMessage.value = "Metode pembayaran wajib diisi"
          return
        }
        if (used.has(p.payment_type)) {
          errorMessage.value = "Metode pembayaran tidak boleh duplikat"
          return
        }
        used.add(p.payment_type)
        if (p.amount <= 0) {
          errorMessage.value = "Nominal pembayaran harus > 0"
          return
        }
      }
      if (paymentDiff.value !== 0) {
        errorMessage.value = "Total pembayaran harus sama dengan total transaksi"
        return
      }
    }
  }

  submitLoading.value = true
  try {
    const res = await $fetch<{ sale_id: string }>("/api/sales", {
      method: "POST",
      body: expenseOnly
        ? {
            expense_only: true,
            sale_date: saleDate.value || undefined,
            expenses: expenses.value,
          }
        : {
            sale_date: saleDate.value || undefined,
            plate_no: plateNo.value.trim(),
            ...(isSplitPayment.value ? { payments: payments.value } : { payment_type: paymentType.value }),
            items: selected.value.map((x) => ({ product_id: x.product.product_id, qty: x.qty })),
            custom_items: customItems.value,
            discount: discount.value,
            expenses: expenses.value,
          },
    })
    lastSaleId.value = res.sale_id
    showSuccessSheet.value = true
    plateNo.value = ""
    selected.value = []
    customItems.value = []
    discount.value = 0
    expenses.value = []
    showCustomForm.value = false
    newCustomName.value = ""
    newCustomQty.value = 1
    newCustomPrice.value = 0
    showExpenseForm.value = false
    newExpenseName.value = ""
    newExpenseAmount.value = 0
    disableSplitPayment()
    await loadSales()
  } catch (error) {
    errorMessage.value = statusMessage(error) ?? "Gagal submit sales"
  } finally {
    submitLoading.value = false
  }
}

function openReceipt(saleId: string) {
  window.open(`/api/sales/${saleId}/receipt`, "_blank")
}

function openSaleDetail(sale: SaleRow) {
  detailSale.value = sale
  detailOpen.value = true
}

function closeSaleDetail() {
  detailOpen.value = false
  detailSale.value = null
}

function printSaleDetail() {
  if (!detailSale.value) return
  openReceipt(detailSale.value.id)
}

function printReceipt() {
  if (lastSaleId.value) {
    openReceipt(lastSaleId.value)
  }
}

function closeSuccessSheet() {
  showSuccessSheet.value = false
  lastSaleId.value = null
}

function openEditSale(s: SaleRow) {
  closeSaleDetail()
  editSaleId.value = s.id
  editIsExpenseOnly.value = isExpenseOnlySale(s)
  editSaleDate.value = s.sale_date
  editPlateNo.value = s.customer_plate_no
  const ps = (s.payments ?? []) as SalePaymentDetail[]
  if (ps.length > 1) {
    editIsSplitPayment.value = true
    editPayments.value = ps.map((p) => ({ payment_type: p.payment_type as PaymentType, amount: p.amount }))
    editPaymentType.value = (editPayments.value[0]?.payment_type ?? "CASH") as PaymentType
  } else {
    editIsSplitPayment.value = false
    editPayments.value = []
    editPaymentType.value = ((ps[0]?.payment_type ?? s.payment_type) as PaymentType) ?? "CASH"
  }
  editDiscount.value = s.discount ?? 0
  editItems.value = (s.items ?? []).map((i) => ({
    product_id: i.product_id,
    sku: i.sku,
    brand: i.brand,
    name: i.name,
    size: i.size,
    qty: i.qty,
    price: i.price,
  }))
  editOriginalItems.value = editItems.value.map((i) => ({ product_id: i.product_id, qty: i.qty }))
  editCustomItems.value = (s.custom_items ?? []).map((c) => ({
    item_name: c.item_name,
    qty: c.qty,
    price: c.price,
  }))
  editExpenses.value = (s.expenses ?? []).map((e) => ({ item_name: e.item_name, amount: e.amount }))
  showEditCustomForm.value = false
  editNewCustomName.value = ""
  editNewCustomQty.value = 1
  editNewCustomPrice.value = 0
  showEditExpenseForm.value = false
  editNewExpenseName.value = ""
  editNewExpenseAmount.value = 0
  editError.value = null
  editSearch.value = ""
  editProducts.value = []
  editDropdownOpen.value = false
  editSearchRan.value = false
  editOpen.value = true
}

function closeEditSale() {
  editOpen.value = false
  editSaleId.value = null
  editIsExpenseOnly.value = false
  editSaleDate.value = ""
  editSaving.value = false
  editError.value = null
  editItems.value = []
  editOriginalItems.value = []
  editCustomItems.value = []
  editExpenses.value = []
  editIsSplitPayment.value = false
  editPayments.value = []
  showEditCustomForm.value = false
  editNewCustomName.value = ""
  editNewCustomQty.value = 1
  editNewCustomPrice.value = 0
  showEditExpenseForm.value = false
  editNewExpenseName.value = ""
  editNewExpenseAmount.value = 0
  editSearch.value = ""
  editProducts.value = []
  editDropdownOpen.value = false
  editSearchRan.value = false
}

async function runEditSearch() {
  editSearchLoading.value = true
  editError.value = null
  try {
    const res = await $fetch<{ items: ProductItem[] }>("/api/products", {
      query: { q: editSearch.value, limit: 50 },
      headers: { Accept: "application/json" },
    })
    editProducts.value = res.items
  } catch (error) {
    editError.value = statusMessage(error) ?? "Gagal mencari produk"
    console.error("Edit product search error:", error)
  } finally {
    editSearchLoading.value = false
    editSearchRan.value = true
  }
}

let editSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null

watch(editSearch, (v) => {
  if (!editOpen.value) return
  const term = v.trim()
  editDropdownOpen.value = term.length > 0
  editSearchRan.value = false
  if (term.length < 2) {
    editProducts.value = []
    return
  }

  if (editSearchDebounceTimer) clearTimeout(editSearchDebounceTimer)
  editSearchDebounceTimer = setTimeout(() => {
    runEditSearch()
  }, 300)
})

function addEditProduct(p: ProductItem) {
  if (p.qty_on_hand <= 0) return
  const existing = editItems.value.find((x) => x.product_id === p.product_id)
  if (existing) {
    existing.qty += 1
    editSearch.value = ""
    editProducts.value = []
    editDropdownOpen.value = false
    return
  }
  editItems.value.push({
    product_id: p.product_id,
    sku: p.sku,
    brand: p.brand,
    name: p.name,
    size: p.size,
    qty: 1,
    price: p.sell_price,
  })
  editSearch.value = ""
  editProducts.value = []
  editDropdownOpen.value = false
}

function removeEditProduct(productId: string) {
  editItems.value = editItems.value.filter((x) => x.product_id !== productId)
}

function incrementEditQty(productId: string) {
  const item = editItems.value.find((x) => x.product_id === productId)
  if (item) item.qty += 1
}

function decrementEditQty(productId: string) {
  const item = editItems.value.find((x) => x.product_id === productId)
  if (item && item.qty > 1) item.qty -= 1
}

function sameItems(a: Array<{ product_id: string; qty: number }>, b: Array<{ product_id: string; qty: number }>) {
  if (a.length !== b.length) return false
  const sa = [...a].sort((x, y) => x.product_id.localeCompare(y.product_id))
  const sb = [...b].sort((x, y) => x.product_id.localeCompare(y.product_id))
  for (let i = 0; i < sa.length; i += 1) {
    if (sa[i]?.product_id !== sb[i]?.product_id) return false
    if (sa[i]?.qty !== sb[i]?.qty) return false
  }
  return true
}

function removeEditCustomItem(idx: number) {
  editCustomItems.value.splice(idx, 1)
}

const editNewCustomName = ref("")
const editNewCustomQty = ref(1)
const editNewCustomPrice = ref(0)
const showEditCustomForm = ref(false)

function addEditCustomItem() {
  if (!editNewCustomName.value.trim() || editNewCustomQty.value < 1 || editNewCustomPrice.value < 0) return
  editCustomItems.value.push({
    item_name: editNewCustomName.value.trim(),
    qty: editNewCustomQty.value,
    price: editNewCustomPrice.value,
  })
  editNewCustomName.value = ""
  editNewCustomQty.value = 1
  editNewCustomPrice.value = 0
  showEditCustomForm.value = false
}

const editSubtotal = computed(() => {
  const productTotal = editItems.value.reduce((sum, i) => sum + i.qty * i.price, 0)
  const customTotal = editCustomItems.value.reduce((sum, i) => sum + i.qty * i.price, 0)
  return productTotal + customTotal
})

const editTotal = computed(() => editSubtotal.value - editDiscount.value)

const editPaymentTotal = computed(() => editPayments.value.reduce((sum, p) => sum + (p.amount || 0), 0))
const editPaymentDiff = computed(() => editTotal.value - editPaymentTotal.value)

const editExpenseTotal = computed(() => editExpenses.value.reduce((sum, e) => sum + (e.amount || 0), 0))
const editBottomTotal = computed(() => (editIsExpenseOnly.value ? editExpenseTotal.value : editTotal.value))

const editNewExpenseName = ref("")
const editNewExpenseAmount = ref(0)
const showEditExpenseForm = ref(false)

function enableEditSplitPayment() {
  editIsSplitPayment.value = true
  if (editPayments.value.length === 0) {
    editPayments.value = [{ payment_type: editPaymentType.value, amount: editTotal.value }]
  }
}

function disableEditSplitPayment() {
  editIsSplitPayment.value = false
  editPayments.value = []
}

function onEditSplitPaymentToggle(e: Event) {
  const checked = (e.target as HTMLInputElement | null)?.checked ?? false
  if (checked) enableEditSplitPayment()
  else disableEditSplitPayment()
}

function addEditPaymentRow() {
  if (editPayments.value.length >= 6) return
  const used = new Set(editPayments.value.map((p) => p.payment_type))
  const options: PaymentType[] = ["CASH", "QRIS", "TRANSFER", "DEBIT", "CREDIT", "TEMPO"]
  const next = options.find((o) => !used.has(o)) ?? "CASH"
  editPayments.value.push({ payment_type: next, amount: 0 })
}

function removeEditPaymentRow(idx: number) {
  editPayments.value.splice(idx, 1)
  if (editPayments.value.length === 0) {
    editPayments.value = [{ payment_type: editPaymentType.value, amount: editTotal.value }]
  }
}

function fillEditPaymentRemaining() {
  if (editPayments.value.length === 0) return
  const idx = editPayments.value.length - 1
  const last = editPayments.value[idx]
  if (!last) return
  const otherSum = editPayments.value.slice(0, idx).reduce((sum, p) => sum + (p.amount || 0), 0)
  const remaining = editTotal.value - otherSum
  editPayments.value[idx] = { payment_type: last.payment_type, amount: Math.max(0, remaining) }
}

function addEditExpense() {
  const name = editNewExpenseName.value.trim()
  if (!name) return
  if (editNewExpenseAmount.value <= 0) return
  editExpenses.value.push({ item_name: name, amount: editNewExpenseAmount.value })
  editNewExpenseName.value = ""
  editNewExpenseAmount.value = 0
  showEditExpenseForm.value = false
}

function removeEditExpense(idx: number) {
  editExpenses.value.splice(idx, 1)
}

async function saveEditSale() {
  if (!editSaleId.value) return
  const expenseOnly = editIsExpenseOnly.value
  const plate = editPlateNo.value.trim()
  if (expenseOnly) {
    if (editExpenses.value.length === 0) {
      editError.value = "Minimal 1 item pengeluaran"
      return
    }
  } else if (!plate) {
    editError.value = "Plat nomor wajib diisi"
    return
  }
  if (!expenseOnly && editIsSplitPayment.value) {
    const used = new Set<string>()
    for (const p of editPayments.value) {
      if (!p.payment_type) {
        editError.value = "Metode pembayaran wajib diisi"
        return
      }
      if (used.has(p.payment_type)) {
        editError.value = "Metode pembayaran tidak boleh duplikat"
        return
      }
      used.add(p.payment_type)
      if (p.amount <= 0) {
        editError.value = "Nominal pembayaran harus > 0"
        return
      }
    }
    if (editPaymentDiff.value !== 0) {
      editError.value = "Total pembayaran harus sama dengan total transaksi"
      return
    }
  }

  const currentItems = editItems.value.map((i) => ({ product_id: i.product_id, qty: i.qty }))
  const includeItems = !expenseOnly && !sameItems(editOriginalItems.value, currentItems)

  editSaving.value = true
  editError.value = null
  try {
    await $fetch(`/api/sales/${editSaleId.value}`, {
      method: "PATCH",
      body: expenseOnly
        ? {
            sale_date: editSaleDate.value || undefined,
            expenses: editExpenses.value,
          }
        : {
            plate_no: plate,
            sale_date: editSaleDate.value || undefined,
            ...(editIsSplitPayment.value ? { payments: editPayments.value } : { payment_type: editPaymentType.value }),
            discount: editDiscount.value,
            items: includeItems ? currentItems : undefined,
            custom_items: editCustomItems.value,
            expenses: editExpenses.value,
          },
    })
    closeEditSale()
    await loadSales()
  } catch (error) {
    editError.value = statusMessage(error) ?? "Gagal update sales"
  } finally {
    editSaving.value = false
  }
}

function openDeleteConfirm(s: SaleRow) {
  closeSaleDetail()
  deleteSaleId.value = s.id
  const preview = saleItemPreview(s, 1)
  deleteSaleLabel.value = preview.lines[0] ?? s.customer_plate_no ?? s.id.slice(0, 8)
  deleteError.value = null
  deleteConfirmOpen.value = true
}

function closeDeleteConfirm() {
  deleteConfirmOpen.value = false
  deleteSaleId.value = null
  deleteLoading.value = false
  deleteError.value = null
}

function openDeleteStockReceiptConfirm(receipt: StockReceiptRow) {
  deleteStockReceiptId.value = receipt.id
  deleteStockReceiptLabel.value = stockReceiptDeleteLabel(receipt)
  deleteStockReceiptError.value = null
  deleteStockReceiptConfirmOpen.value = true
}

function closeDeleteStockReceiptConfirm() {
  deleteStockReceiptConfirmOpen.value = false
  deleteStockReceiptId.value = null
  deleteStockReceiptLoading.value = false
  deleteStockReceiptError.value = null
}

async function confirmDelete() {
  if (!deleteSaleId.value) return
  deleteLoading.value = true
  deleteError.value = null
  try {
    await $fetch(`/api/sales/${deleteSaleId.value}`, { method: "DELETE" })
    closeDeleteConfirm()
    await loadSales()
  } catch (error) {
    deleteError.value = statusMessage(error) ?? "Gagal menghapus transaksi"
  } finally {
    deleteLoading.value = false
  }
}

async function confirmDeleteStockReceipt() {
  if (!deleteStockReceiptId.value) return
  deleteStockReceiptLoading.value = true
  deleteStockReceiptError.value = null
  try {
    await $fetch("/api/sales/stock-receipts", {
      method: "DELETE",
      query: { id: deleteStockReceiptId.value },
    })
    closeDeleteStockReceiptConfirm()
    await loadSales()
  } catch (error) {
    deleteStockReceiptError.value = statusMessage(error) ?? "Gagal menghapus barang masuk"
  } finally {
    deleteStockReceiptLoading.value = false
  }
}

async function newTransaction() {
  showSuccessSheet.value = false
  lastSaleId.value = null
  await new Promise(resolve => setTimeout(resolve, 350))
  searchInputRef.value?.focus()
}

const detailLineItems = computed<(SaleItemDetail | CustomItemDetail)[]>(() => {
  if (!detailSale.value) return []
  return [...(detailSale.value.items ?? []), ...(detailSale.value.custom_items ?? [])]
})

const detailPayments = computed<SalePaymentDetail[]>(() => detailSale.value?.payments ?? [])
const detailExpenses = computed<SaleExpenseDetail[]>(() => detailSale.value?.expenses ?? [])
const detailExpenseTotal = computed(() => {
  if (!detailSale.value) return 0
  if (typeof detailSale.value.expense_total === "number") return detailSale.value.expense_total
  return (detailSale.value.expenses ?? []).reduce((sum, expense) => sum + (expense.amount || 0), 0)
})
</script>

<template>
  <div class="salesPage">
    <div class="mobileTabBar">
      <button 
        ref="inputTabButtonRef"
        class="tabBtn" 
        :class="{ active: activeTab === 'input' }" 
        @click="openInputModeSheet($event)"
      >
        <svg class="tabIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>Input</span>
      </button>
      <button 
        class="tabBtn" 
        :class="{ active: activeTab === 'history' }" 
        @click="activeTab = 'history'; closeInputModeSheet()"
      >
        <svg class="tabIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Riwayat</span>
      </button>
    </div>

    <div class="tabContent" :class="{ hidden: activeTab !== 'input' }">
      <div class="inputModeBar">
        <button type="button" class="inputModeChip" @click="openInputModeSheet($event)">{{ currentInputModeText }}</button>
      </div>

      <div v-if="isStockReceiptOnly" class="stockReceiptSection">
        <div class="stockReceiptHeader">
          <div>
            <div class="stockReceiptTitle">Barang Masuk Harian</div>
            <div class="stockReceiptMeta">Satu baris satu item. Tanda = opsional dan qty yang sama akan dijumlahkan otomatis.</div>
          </div>
          <div class="stockReceiptMeta strong">{{ parsedStockReceiptItems.length }} baris valid • {{ stockReceiptTotalQty }} qty</div>
        </div>
        <textarea
          ref="stockReceiptInputRef"
          v-model="stockReceiptRawInput"
          class="formInput stockReceiptTextarea"
          :placeholder="stockReceiptPlaceholder"
        />
        <div v-if="stockReceiptParseErrors.length" class="stockReceiptErrorList">
          <div v-for="message in stockReceiptParseErrors" :key="message" class="stockReceiptErrorItem">
            {{ message }}
          </div>
        </div>
        <div v-else-if="parsedStockReceiptItems.length" class="stockReceiptPreview">
          <div class="stockReceiptPreviewHeader">
            <span>Siap Disimpan</span>
            <span>{{ stockReceiptTotalQty }} qty</span>
          </div>
          <div class="stockReceiptPreviewList">
            <div
              v-for="(item, index) in parsedStockReceiptItems"
              :key="`${item.item_name}-${item.unit_label}-${index}`"
              class="stockReceiptPreviewRow"
            >
              <span class="stockReceiptPreviewQty">{{ item.qty }} {{ item.unit_label }}</span>
              <span class="stockReceiptPreviewName">{{ item.item_name }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isStandardSale" class="searchSection">
        <div class="searchWrapper">
          <svg class="searchIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref="searchInputRef"
            v-model="search"
            class="searchInput"
            type="search"
            inputmode="search"
            placeholder="Cari SKU / brand / nama..."
            @keydown.enter.prevent="runSearch"
            @keydown.esc.prevent="dropdownOpen = false"
            @focus="dropdownOpen = true"
          />
          <button v-if="search" class="clearBtn" @click="search = ''; products = []">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="dropdownOpen && (products.length || searchLoading || searchRan)" class="searchResults">
          <div v-if="searchLoading" class="searchLoading">
            <div class="spinner" />
            <span>Mencari...</span>
          </div>
          <template v-else-if="products.length">
            <button
              v-for="p in products"
              :key="p.product_id"
              type="button"
              class="productCard"
              :disabled="p.qty_on_hand <= 0"
              @click="addProduct(p)"
            >
              <div class="productInfo">
                <div class="productName">{{ productDisplayName(p.brand, p.name) }}</div>
                <div class="productMeta">{{ p.size }} • {{ p.sku }}</div>
              </div>
              <div class="productRight">
                <div class="productPrice">Rp {{ rupiah(p.sell_price) }}</div>
                <div class="productStock" :class="{ low: p.qty_on_hand <= 5 }">
                  Stok: {{ p.qty_on_hand }}
                </div>
              </div>
              <svg class="addIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </template>
          <div v-else-if="searchRan" class="noResults">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Produk tidak ditemukan</span>
            <span v-if="me.user.value?.role === 'ADMIN'" class="noResultsHint">
              <NuxtLink to="/products">+ Tambah Produk</NuxtLink>
            </span>
          </div>
        </div>
      </div>

      <div v-if="isStandardSale && (selected.length || customItems.length)" class="cartSection">
        <div class="cartHeader">
          <span class="cartTitle">Item Transaksi</span>
          <span class="cartBadge">{{ itemCount }} item</span>
        </div>
        <div class="cartItems">
          <div v-for="x in selected" :key="x.product.product_id" class="cartItem">
            <button class="removeBtn" @click="removeProduct(x.product.product_id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <div class="cartItemInfo">
              <div class="cartItemName">{{ productDisplayName(x.product.brand, x.product.name) }}</div>
              <div class="cartItemMeta">{{ x.product.size }} • Rp {{ rupiah(x.product.sell_price) }}</div>
            </div>
            <div class="qtyControl">
              <button class="qtyBtn" @click="decrementQty(x.product.product_id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M5 12h14" />
                </svg>
              </button>
              <span class="qtyValue">{{ x.qty }}</span>
              <button class="qtyBtn" @click="incrementQty(x.product.product_id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
            <div class="cartItemTotal">Rp {{ rupiah(x.qty * x.product.sell_price) }}</div>
          </div>
          <div v-for="(ci, idx) in customItems" :key="'ci-' + idx" class="cartItem customCartItem">
            <button class="removeBtn" @click="removeCustomItem(idx)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <div class="cartItemInfo">
              <div class="cartItemName">{{ ci.item_name }}</div>
              <div class="cartItemMeta">Custom • Rp {{ rupiah(ci.price) }}</div>
            </div>
            <div class="qtyControl">
              <span class="qtyValue">{{ ci.qty }}</span>
            </div>
            <div class="cartItemTotal">Rp {{ rupiah(ci.qty * ci.price) }}</div>
          </div>
        </div>
      </div>

      <div v-else-if="isStandardSale" class="emptyState">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <span>Belum ada item</span>
        <span class="emptyHint">Cari produk untuk ditambahkan ke transaksi</span>
      </div>

      <div v-if="isStandardSale" class="customItemSection">
        <button v-if="!showCustomForm" type="button" class="addCustomBtn" @click="showCustomForm = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Tambah Item Custom (Jasa/Lain-lain)
        </button>
        <div v-else class="customForm">
          <div class="customFormTitle">Item Custom</div>
          <div class="customFormFields">
            <input v-model="newCustomName" class="formInput" placeholder="Nama item (cth: Ongkos Pasang)" />
            <div class="customFormRow">
              <input v-model.number="newCustomQty" class="formInput formInputSmall" type="number" min="1" placeholder="Qty" />
              <input v-model.number="newCustomPrice" class="formInput" type="number" min="0" placeholder="Harga" />
            </div>
          </div>
          <div class="customFormActions">
            <button type="button" class="mb-btn" @click="showCustomForm = false">Batal</button>
            <button type="button" class="mb-btnPrimary" @click="addCustomItem">Tambah</button>
          </div>
        </div>
      </div>

      <div class="formSection">
        <div class="formRow">
          <label class="formField">
            <span class="formLabel">{{ isStockReceiptOnly ? "Tanggal Barang Masuk" : "Tanggal Transaksi" }}</span>
            <input
              v-model="saleDate"
              class="formInput"
              type="date"
            />
          </label>
        </div>

        <template v-if="isStandardSale">
        <div class="formRow">
          <label class="formField">
            <span class="formLabel">Plat Nomor</span>
            <input 
              v-model="plateNo" 
              class="formInput" 
              placeholder="B 1234 ABC"
              inputmode="text"
              autocapitalize="characters"
            />
          </label>
        </div>
        <div class="paymentHeader">
          <span class="formLabel">Pembayaran</span>
          <label class="splitToggle">
            <input
              type="checkbox"
              :checked="isSplitPayment"
              @change="onSplitPaymentToggle"
            />
            <span>Split</span>
          </label>
        </div>
        <div v-if="!isSplitPayment" class="paymentGrid">
          <button
            v-for="pt in ['CASH', 'QRIS', 'TRANSFER', 'DEBIT', 'CREDIT', 'TEMPO'] as const"
            :key="pt"
            class="paymentBtn"
            :class="{ active: paymentType === pt }"
            @click="paymentType = pt"
          >
            {{ pt }}
          </button>
        </div>
        <div v-else class="splitPaymentBox">
          <div v-for="(p, idx) in payments" :key="'pay-' + idx" class="splitPaymentRow">
            <select v-model="p.payment_type" class="formInput splitSelect">
              <option v-for="pt in ['CASH', 'QRIS', 'TRANSFER', 'DEBIT', 'CREDIT', 'TEMPO'] as const" :key="pt" :value="pt">
                {{ pt }}
              </option>
            </select>
            <input v-model.number="p.amount" class="formInput splitAmount" type="number" min="0" placeholder="0" />
            <button v-if="payments.length > 1" type="button" class="splitRemove" @click="removePaymentRow(idx)">×</button>
          </div>
          <div class="splitPaymentActions">
            <button type="button" class="mb-btn" @click="addPaymentRow">Tambah metode</button>
            <button type="button" class="mb-btn" @click="fillPaymentRemaining">Isi sisa</button>
          </div>
          <div class="splitPaymentSummary" :class="{ bad: paymentDiff !== 0 }">
            <span>Total bayar: Rp {{ rupiah(paymentTotal) }}</span>
            <span v-if="paymentDiff === 0">Pas</span>
            <span v-else>{{ paymentDiff > 0 ? 'Kurang' : 'Lebih' }} Rp {{ rupiah(Math.abs(paymentDiff)) }}</span>
          </div>
        </div>
        <div class="adjustmentRow">
          <label class="formField formFieldSmall">
            <span class="formLabel">Diskon</span>
            <input v-model.number="discount" class="formInput" type="number" min="0" placeholder="0" />
          </label>
        </div>
        </template>

        <div v-if="!isStockReceiptOnly" class="expenseSection">
          <div class="expenseHeader">
            <span class="formLabel">Pengeluaran</span>
            <span v-if="expenseTotal > 0" class="expenseTotal">Rp {{ rupiah(expenseTotal) }}</span>
          </div>
          <div v-if="expenses.length" class="expenseList">
            <div v-for="(e, idx) in expenses" :key="'exp-' + idx" class="expenseRow">
              <span class="expenseName">{{ e.item_name }}</span>
              <span class="expenseAmount">Rp {{ rupiah(e.amount) }}</span>
              <button type="button" class="expenseRemove" @click="removeExpense(idx)">×</button>
            </div>
          </div>

          <button v-if="!showExpenseForm" type="button" class="addCustomBtn" @click="showExpenseForm = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Tambah Biaya Pengeluaran
          </button>
          <div v-else class="customForm">
            <div class="customFormTitle">Biaya Pengeluaran</div>
            <div class="customFormFields">
              <input v-model="newExpenseName" class="formInput" placeholder="Nama biaya (cth: Bonus, Kopi, Air)" />
              <input v-model.number="newExpenseAmount" class="formInput" type="number" min="0" placeholder="Nominal" />
            </div>
            <div class="customFormActions">
              <button type="button" class="mb-btn" @click="showExpenseForm = false">Batal</button>
              <button type="button" class="mb-btnPrimary" @click="addExpense">Tambah</button>
            </div>
          </div>
        </div>
      </div>

      <p v-if="errorMessage" class="errorMsg">{{ errorMessage }}</p>
    </div>

    <div class="tabContent" :class="{ hidden: activeTab !== 'history' }">
      <div class="historyHeader">
        <span class="historyTitle">{{ searchAllDates ? 'Semua Sales' : 'Sales Hari Ini' }}</span>
        <div class="historyHeaderActions">
          <label v-if="isAdmin" class="allDatesToggle">
            <input v-model="searchAllDates" type="checkbox" @change="loadSales()" />
            <span>Semua tanggal</span>
          </label>
          <button
            class="refreshBtn"
            :disabled="salesLoading"
            @click="lastHistoryQuery = historyQuery.trim(); loadSales()"
          >
            <svg 
              class="refreshIcon" 
              :class="{ spinning: salesLoading }"
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="2"
            >
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div class="historySearchBar">
        <div class="historySearchWrap">
          <svg class="historySearchIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            v-model="historyQuery"
            class="historySearchInput"
            type="search"
            inputmode="search"
            placeholder="Cari plat nomor / item / barang masuk..."
            @keydown.enter.prevent="lastHistoryQuery = historyQuery.trim(); loadSales()"
          />
          <button
            v-if="historyQuery"
            type="button"
            class="historyClearBtn"
            @click="historyQuery = ''; lastHistoryQuery = ''; loadSales()"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div class="dailySummaryPanel">
        <div class="dailySummaryGrid">
          <div class="dailySumItem">
            <span class="dailySumLabel">Ban</span>
            <span class="dailySumValue">{{ qtySummary.ban_qty }}</span>
          </div>
          <div class="dailySumItem">
            <span class="dailySumLabel">Total Transaksi</span>
            <span class="dailySumValue">{{ dailySummary.total_transactions }}</span>
          </div>
          <div class="dailySumItem">
            <span class="dailySumLabel">Omset</span>
            <span class="dailySumValue">Rp {{ rupiah(dailySummary.omzet) }}</span>
          </div>
          <div class="dailySumItem">
            <span class="dailySumLabel">Pengeluaran</span>
            <span class="dailySumValue">Rp {{ rupiah(dailySummary.pengeluaran) }}</span>
          </div>
          <div class="dailySumItem dailySumItemStrong">
            <span class="dailySumLabel">Sisa Omset</span>
            <span class="dailySumValue">Rp {{ rupiah(dailySummary.sisa_omzet) }}</span>
          </div>
          <div class="dailySumItem">
            <span class="dailySumLabel">Tunai</span>
            <span class="dailySumValue">Rp {{ rupiah(dailySummary.tunai) }}</span>
          </div>
          <div class="dailySumItem">
            <span class="dailySumLabel">QRIS</span>
            <span class="dailySumValue">Rp {{ rupiah(dailySummary.qris) }}</span>
          </div>
          <div class="dailySumItem">
            <span class="dailySumLabel">Debit</span>
            <span class="dailySumValue">Rp {{ rupiah(dailySummary.debit) }}</span>
          </div>
          <div class="dailySumItem">
            <span class="dailySumLabel">Transfer</span>
            <span class="dailySumValue">Rp {{ rupiah(dailySummary.transfer) }}</span>
          </div>
          <div class="dailySumItem">
            <span class="dailySumLabel">Kredit</span>
            <span class="dailySumValue">Rp {{ rupiah(dailySummary.credit) }}</span>
          </div>
        </div>
      </div>

      <div v-if="stockReceipts.length" class="stockReceiptHistorySection">
        <div class="stockReceiptHistoryHeader">
          <span class="stockReceiptHistoryTitle">{{ searchAllDates ? 'Barang Masuk' : 'Barang Masuk Hari Ini' }}</span>
          <span class="stockReceiptHistoryMeta">{{ stockReceipts.length }} input</span>
        </div>
        <div class="stockReceiptHistoryList">
          <div v-for="receipt in stockReceipts" :key="receipt.id" class="stockReceiptCard">
            <div class="stockReceiptCardHeader">
              <div class="stockReceiptBadgeRow">
                <span class="stockReceiptBadge">Barang Masuk</span>
                <span class="saleDateBadge">{{ formatDate(receipt.receipt_date) }}</span>
                <span class="saleTime">{{ hhmm(receipt.created_at) }} WIB</span>
              </div>
              <div class="stockReceiptCardActions">
                <div class="stockReceiptCardTotal">{{ receipt.total_qty }} qty</div>
                <button
                  v-if="isAdmin"
                  type="button"
                  class="stockReceiptDeleteBtn"
                  @click.stop="openDeleteStockReceiptConfirm(receipt)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                  </svg>
                  <span>Hapus</span>
                </button>
              </div>
            </div>
            <div class="stockReceiptCardItems">
              <div
                v-for="(item, index) in receipt.items"
                :key="`${receipt.id}-${item.item_name}-${item.unit_label}-${index}`"
                class="stockReceiptItemLine"
              >
                {{ item.qty }} {{ item.unit_label }} {{ item.item_name }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="salesLoading" class="loadingState">
        <MbSkeleton :count="isInitialLoad ? 5 : 3" height="72px" />
      </div>

      <div v-else-if="sales.length" class="salesList">
        <div
          v-for="s in sales" 
          :key="s.id" 
          class="saleCard"
          role="button"
          tabindex="0"
          @click="openSaleDetail(s)"
          @keydown.enter.prevent="openSaleDetail(s)"
        >
          <div class="saleInfo">
            <div v-if="salePreview(s).lines.length" class="saleItemsTop">
              <div v-for="(line, idx) in salePreview(s).lines" :key="idx" class="saleItemLineTop">
                {{ line }}
              </div>
              <div v-if="salePreview(s).more" class="saleItemMoreTop">+{{ salePreview(s).more }} item</div>
            </div>
            <div v-else class="saleItemsTop">
              <div class="saleItemLineTop">{{ isExpenseOnlySale(s) ? "Pengeluaran Saja" : salePlateText(s) }}</div>
            </div>
            <div class="saleMeta">
              <span class="salePlateBadge">{{ salePlateText(s) }}</span>
              <span class="saleDateBadge">{{ formatDate(s.sale_date) }}</span>
              <span class="saleTime">{{ hhmm(s.created_at) }} WIB</span>
              <span v-if="!isExpenseOnlySale(s)" class="salePayment">{{ paymentLabel(s) }}</span>
              <span v-if="isExpenseOnlySale(s)" class="saleExpenseOnly">Pengeluaran</span>
              <span v-if="s.discount > 0" class="saleDiscount">-{{ rupiah(s.discount) }}</span>
            </div>
            <div v-if="s.expenses && s.expenses.length" class="saleExpensesDetail">
              <div v-for="(exp, ei) in s.expenses" :key="ei" class="saleExpenseDetailRow">
                <span class="saleExpenseDetailName">{{ exp.item_name }}</span>
                <span class="saleExpenseDetailAmount">-Rp {{ rupiah(exp.amount) }}</span>
              </div>
            </div>
          </div>
          <div class="saleRight">
            <div class="saleTotal">Rp {{ rupiah(saleDisplayTotal(s)) }}</div>
            <div class="saleActions">
              <a
                class="printLabel"
                :href="`/api/sales/${s.id}/receipt`"
                target="_blank"
                rel="noreferrer"
                @click.stop
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Cetak
              </a>
              <button
                v-if="isAdmin"
                type="button"
                class="editLabel"
                @click.stop="openEditSale(s)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path
                    d="M12 20h9"
                  />
                  <path
                    d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"
                  />
                </svg>
                Edit
              </button>
              <button
                v-if="isAdmin"
                type="button"
                class="deleteLabel"
                @click.stop="openDeleteConfirm(s)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                </svg>
                Hapus
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="stockReceipts.length === 0" class="emptyHistory">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <span v-if="historyQuery.trim()">Tidak ada transaksi yang cocok</span>
        <span v-else>Belum ada transaksi hari ini</span>
      </div>
    </div>

    <div v-if="activeTab === 'input'" class="bottomBar">
      <div class="totalSection">
        <span class="totalLabel">{{ isStockReceiptOnly ? "Total Qty" : isExpenseOnly ? "Total Pengeluaran" : "Total" }}</span>
        <span class="totalValue">{{ bottomValueText }}</span>
      </div>
      <button 
        :class="['submitBtn', { 'is-loading': submitLoading }]"
        :disabled="submitDisabled"
        @click="submit"
      >
        <template v-if="submitLoading">
          <div class="spinner light" />
          <span>Memproses...</span>
        </template>
        <template v-else>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M5 13l4 4L19 7" />
          </svg>
          <span>Simpan</span>
        </template>
      </button>
    </div>

    <Teleport to="body">
      <Transition name="mode-popover">
        <div v-if="inputModeSheetOpen" class="inputModePopoverOverlay" @click.self="closeInputModeSheet">
          <div class="inputModePopover" :style="inputModePopoverStyle" @click.stop>
            <div class="inputModeSheetHeader">
              <div>
                <div class="inputModeSheetTitle">Pilih Jenis Input</div>
                <div class="inputModeSheetSub">Pilih mode yang ingin dibuka.</div>
              </div>
              <button type="button" class="detailCloseBtn" aria-label="Tutup pilihan jenis input" @click="closeInputModeSheet">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="modeGrid">
              <button
                type="button"
                class="modeCard"
                :class="{ active: currentInputMode === 'sale' }"
                @click="selectInputMode('sale')"
              >
                <span class="modeCardIcon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
                <span class="modeCardContent">
                  <span class="modeCardTitle">Input Sales</span>
                  <span class="modeCardDesc">Transaksi barang keluar, jasa, dan pembayaran.</span>
                </span>
              </button>
              <button
                type="button"
                class="modeCard"
                :class="{ active: currentInputMode === 'expense' }"
                @click="selectInputMode('expense')"
              >
                <span class="modeCardIcon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                    <path d="M3 19h18" />
                  </svg>
                </span>
                <span class="modeCardContent">
                  <span class="modeCardTitle">Input Pengeluaran</span>
                  <span class="modeCardDesc">Biaya operasional tanpa SKU dan tanpa plat nomor.</span>
                </span>
              </button>
              <button
                type="button"
                class="modeCard"
                :class="{ active: currentInputMode === 'receipt' }"
                @click="selectInputMode('receipt')"
              >
                <span class="modeCardIcon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                    <path d="M12 12v5M9.5 14.5L12 17l2.5-2.5" />
                  </svg>
                </span>
                <span class="modeCardContent">
                  <span class="modeCardTitle">Input Barang Masuk</span>
                  <span class="modeCardDesc">Log barang masuk harian dengan format teks cepat.</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="detailOpen && detailSale" class="successOverlay" @click.self="closeSaleDetail">
          <div class="detailSheet">
            <div class="detailSheetHeader">
              <div>
                <div class="detailTitle">Detail Transaksi</div>
                <div class="detailSub">ID: {{ detailSale.id.slice(0, 8) }}</div>
              </div>
              <button type="button" class="detailCloseBtn" aria-label="Tutup detail transaksi" @click="closeSaleDetail">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="detailMetaGrid">
              <div class="detailMetaCard">
                <span class="detailMetaLabel">Tanggal</span>
                <strong>{{ formatDate(detailSale.sale_date) }}</strong>
              </div>
              <div class="detailMetaCard">
                <span class="detailMetaLabel">Jam Input</span>
                <strong>{{ hhmm(detailSale.created_at) }} WIB</strong>
              </div>
              <div class="detailMetaCard">
                <span class="detailMetaLabel">Plat Nomor</span>
                <strong>{{ salePlateText(detailSale) }}</strong>
              </div>
              <div class="detailMetaCard">
                <span class="detailMetaLabel">Status</span>
                <strong>{{ isExpenseOnlySale(detailSale) ? "Pengeluaran" : "Penjualan" }}</strong>
              </div>
            </div>

            <div v-if="detailLineItems.length" class="detailBlock">
              <div class="detailBlockTitle">Item</div>
              <div v-for="(item, idx) in detailLineItems" :key="`${detailSale.id}-item-${idx}`" class="detailRow">
                <div class="detailRowMain">
                  <div class="detailRowTitle">{{ saleItemTitle(item) }}</div>
                  <div class="detailRowMeta">{{ item.type === 'custom' ? 'Custom item' : 'Produk' }} • Qty {{ item.qty }}</div>
                </div>
                <div class="detailRowPrice">
                  <div>Rp {{ rupiah(item.line_total) }}</div>
                  <span>@ Rp {{ rupiah(item.price) }}</span>
                </div>
              </div>
            </div>

            <div v-if="detailPayments.length" class="detailBlock">
              <div class="detailBlockTitle">Pembayaran</div>
              <div v-for="(payment, idx) in detailPayments" :key="`${detailSale.id}-payment-${idx}`" class="detailSimpleRow">
                <span>{{ payment.payment_type }}</span>
                <strong>Rp {{ rupiah(payment.amount) }}</strong>
              </div>
            </div>
            <div v-else-if="!isExpenseOnlySale(detailSale)" class="detailBlock">
              <div class="detailBlockTitle">Pembayaran</div>
              <div class="detailSimpleRow">
                <span>{{ detailSale.payment_type || 'Belum ada data' }}</span>
              </div>
            </div>

            <div v-if="detailExpenses.length" class="detailBlock">
              <div class="detailBlockTitle">Pengeluaran</div>
              <div v-for="(expense, idx) in detailExpenses" :key="`${detailSale.id}-expense-${idx}`" class="detailSimpleRow detailSimpleRowDanger">
                <span>{{ expense.item_name }}</span>
                <strong>Rp {{ rupiah(expense.amount) }}</strong>
              </div>
            </div>

            <div class="detailSummaryCard">
              <div v-if="!isExpenseOnlySale(detailSale)" class="detailSummaryRow">
                <span>Subtotal</span>
                <strong>Rp {{ rupiah(detailSale.subtotal) }}</strong>
              </div>
              <div v-if="!isExpenseOnlySale(detailSale) && detailSale.discount > 0" class="detailSummaryRow detailSummaryRowDanger">
                <span>Diskon</span>
                <strong>-Rp {{ rupiah(detailSale.discount) }}</strong>
              </div>
              <div v-if="!isExpenseOnlySale(detailSale) && detailSale.service_fee > 0" class="detailSummaryRow">
                <span>Service</span>
                <strong>Rp {{ rupiah(detailSale.service_fee) }}</strong>
              </div>
              <div v-if="!isExpenseOnlySale(detailSale)" class="detailSummaryRow detailSummaryRowStrong">
                <span>Total Transaksi</span>
                <strong>Rp {{ rupiah(detailSale.total) }}</strong>
              </div>
              <div v-if="detailExpenseTotal > 0" class="detailSummaryRow" :class="{ detailSummaryRowStrong: isExpenseOnlySale(detailSale) }">
                <span>{{ isExpenseOnlySale(detailSale) ? 'Total Pengeluaran' : 'Total Pengeluaran Tambahan' }}</span>
                <strong>Rp {{ rupiah(detailExpenseTotal) }}</strong>
              </div>
              <div v-if="detailSale.printed_first_at" class="detailPrintInfo">
                Sudah pernah dicetak: {{ formatDateTime(detailSale.printed_first_at) }} WIB
              </div>
            </div>

            <div class="detailActions">
              <button type="button" class="newTxBtn" @click="closeSaleDetail">Tutup</button>
              <button type="button" class="printBtn" @click="printSaleDetail">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Cetak Struk
              </button>
            </div>

            <div v-if="isAdmin" class="detailAdminActions">
              <button type="button" class="editDetailBtn" @click="openEditSale(detailSale)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
                Edit
              </button>
              <button type="button" class="deleteDetailBtn" @click="openDeleteConfirm(detailSale)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                </svg>
                Hapus
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="showSuccessSheet" class="successOverlay" @click.self="closeSuccessSheet">
          <div class="successSheet">
            <div class="successIcon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="successTitle">Transaksi Berhasil!</div>
            <div class="successSub">Struk siap dicetak</div>
            <div class="successActions">
              <button class="printBtn" @click="printReceipt">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Cetak Struk
              </button>
              <button class="newTxBtn" @click="newTransaction">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="deleteConfirmOpen" class="successOverlay" @click.self="closeDeleteConfirm">
          <div class="deleteSheet">
            <div class="deleteSheetIcon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
            </div>
            <div class="deleteSheetTitle">Hapus Transaksi?</div>
            <div class="deleteSheetSub">{{ deleteSaleLabel }}</div>
            <p v-if="deleteError" class="errorMsg">{{ deleteError }}</p>
            <div class="deleteSheetActions">
              <button type="button" class="newTxBtn" :disabled="deleteLoading" @click="closeDeleteConfirm">Batal</button>
              <button type="button" class="deleteConfirmBtn" :disabled="deleteLoading" @click="confirmDelete">
                <template v-if="deleteLoading">
                  <div class="spinner light" />
                  <span>Menghapus...</span>
                </template>
                <template v-else>Ya, Hapus</template>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="deleteStockReceiptConfirmOpen" class="successOverlay" @click.self="closeDeleteStockReceiptConfirm">
          <div class="deleteSheet">
            <div class="deleteSheetIcon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
            </div>
            <div class="deleteSheetTitle">Hapus Barang Masuk?</div>
            <div class="deleteSheetSub">{{ deleteStockReceiptLabel }}</div>
            <p v-if="deleteStockReceiptError" class="errorMsg">{{ deleteStockReceiptError }}</p>
            <div class="deleteSheetActions">
              <button
                type="button"
                class="newTxBtn"
                :disabled="deleteStockReceiptLoading"
                @click="closeDeleteStockReceiptConfirm"
              >
                Batal
              </button>
              <button
                type="button"
                class="deleteConfirmBtn"
                :disabled="deleteStockReceiptLoading"
                @click="confirmDeleteStockReceipt"
              >
                <template v-if="deleteStockReceiptLoading">
                  <div class="spinner light" />
                  <span>Menghapus...</span>
                </template>
                <template v-else>Ya, Hapus</template>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="editOpen" class="successOverlay" @click.self="closeEditSale">
          <div class="editSheet">
            <div class="editTitle">Edit Transaksi</div>
            <div v-if="editSaleId" class="editSub">ID: {{ editSaleId.slice(0, 8) }}</div>

            <div class="formSection editForm">
              <div v-if="!editIsExpenseOnly" class="searchSection editSearchSection">
                <div class="searchWrapper">
                  <svg class="searchIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    v-model="editSearch"
                    class="searchInput"
                    type="search"
                    inputmode="search"
                    placeholder="Tambah produk (SKU / brand / nama)..."
                    @keydown.enter.prevent="runEditSearch"
                    @keydown.esc.prevent="editDropdownOpen = false"
                    @focus="editDropdownOpen = true"
                  />
                  <button v-if="editSearch" class="clearBtn" @click="editSearch = ''; editProducts = []">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div v-if="editDropdownOpen && (editProducts.length || editSearchLoading || editSearchRan)" class="searchResults">
                  <div v-if="editSearchLoading" class="searchLoading">
                    <div class="spinner" />
                    <span>Mencari...</span>
                  </div>
                  <template v-else-if="editProducts.length">
                    <button
                      v-for="p in editProducts"
                      :key="p.product_id"
                      type="button"
                      class="productCard"
                      :disabled="p.qty_on_hand <= 0"
                      @click="addEditProduct(p)"
                    >
                      <div class="productInfo">
                        <div class="productName">{{ productDisplayName(p.brand, p.name) }}</div>
                        <div class="productMeta">{{ p.size }} • {{ p.sku }}</div>
                      </div>
                      <div class="productRight">
                        <div class="productPrice">Rp {{ rupiah(p.sell_price) }}</div>
                        <div class="productStock" :class="{ low: p.qty_on_hand <= 5 }">Stok: {{ p.qty_on_hand }}</div>
                      </div>
                      <svg class="addIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </template>
                  <div v-else-if="editSearchRan" class="noResults">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Produk tidak ditemukan</span>
                  </div>
                </div>
              </div>

              <div class="formRow">
                <label class="formField">
                  <span class="formLabel">Tanggal Transaksi</span>
                  <input
                    v-model="editSaleDate"
                    class="formInput"
                    type="date"
                  />
                </label>
              </div>
              <div v-if="!editIsExpenseOnly" class="formRow">
                <label class="formField">
                  <span class="formLabel">Plat Nomor</span>
                  <input
                    v-model="editPlateNo"
                    class="formInput"
                    placeholder="B 1234 ABC"
                    inputmode="text"
                    autocapitalize="characters"
                  />
                </label>
              </div>
              <div v-if="!editIsExpenseOnly" class="paymentHeader">
                <span class="formLabel">Pembayaran</span>
                <label class="splitToggle">
                  <input
                    type="checkbox"
                    :checked="editIsSplitPayment"
                    @change="onEditSplitPaymentToggle"
                  />
                  <span>Split</span>
                </label>
              </div>
              <div v-if="!editIsExpenseOnly && !editIsSplitPayment" class="paymentGrid">
                <button
                  v-for="pt in ['CASH', 'QRIS', 'TRANSFER', 'DEBIT', 'CREDIT', 'TEMPO'] as const"
                  :key="pt"
                  type="button"
                  class="paymentBtn"
                  :class="{ active: editPaymentType === pt }"
                  @click="editPaymentType = pt"
                >
                  {{ pt }}
                </button>
              </div>
              <div v-else-if="!editIsExpenseOnly" class="splitPaymentBox">
                <div v-for="(p, idx) in editPayments" :key="'edit-pay-' + idx" class="splitPaymentRow">
                  <select v-model="p.payment_type" class="formInput splitSelect">
                    <option v-for="pt in ['CASH', 'QRIS', 'TRANSFER', 'DEBIT', 'CREDIT', 'TEMPO'] as const" :key="pt" :value="pt">
                      {{ pt }}
                    </option>
                  </select>
                  <input v-model.number="p.amount" class="formInput splitAmount" type="number" min="0" placeholder="0" />
                  <button v-if="editPayments.length > 1" type="button" class="splitRemove" @click="removeEditPaymentRow(idx)">×</button>
                </div>
                <div class="splitPaymentActions">
                  <button type="button" class="mb-btn" @click="addEditPaymentRow">Tambah metode</button>
                  <button type="button" class="mb-btn" @click="fillEditPaymentRemaining">Isi sisa</button>
                </div>
                <div class="splitPaymentSummary" :class="{ bad: editPaymentDiff !== 0 }">
                  <span>Total bayar: Rp {{ rupiah(editPaymentTotal) }}</span>
                  <span v-if="editPaymentDiff === 0">Pas</span>
                  <span v-else>{{ editPaymentDiff > 0 ? 'Kurang' : 'Lebih' }} Rp {{ rupiah(Math.abs(editPaymentDiff)) }}</span>
                </div>
              </div>
               
              <div v-if="!editIsExpenseOnly && editItems.length" class="editItemsList">
                <div class="editItemsTitle">Item Produk</div>
                <div v-for="(ei, idx) in editItems" :key="'ei-' + idx" class="editItemRow">
                  <span class="editItemName">{{ productDisplayName(ei.brand, ei.name) }} {{ ei.size }}</span>
                  <div class="editQtyControls">
                    <button type="button" class="qtyBtn" @click="decrementEditQty(ei.product_id)">-</button>
                    <span class="qtyValue">{{ ei.qty }}</span>
                    <button type="button" class="qtyBtn" @click="incrementEditQty(ei.product_id)">+</button>
                  </div>
                  <span class="editItemPrice">{{ rupiah(ei.qty * ei.price) }}</span>
                  <button type="button" class="editItemRemove" @click="removeEditProduct(ei.product_id)">×</button>
                </div>
              </div>

              <div v-if="!editIsExpenseOnly && editCustomItems.length" class="editItemsList">
                <div class="editItemsTitle">Item Custom</div>
                <div v-for="(ec, idx) in editCustomItems" :key="'ec-' + idx" class="editItemRow">
                  <span class="editItemName">{{ ec.item_name }}</span>
                  <span class="editItemQty">x{{ ec.qty }}</span>
                  <span class="editItemPrice">{{ rupiah(ec.qty * ec.price) }}</span>
                  <button type="button" class="editItemRemove" @click="removeEditCustomItem(idx)">×</button>
                </div>
              </div>

              <div v-if="!editIsExpenseOnly" class="customItemSection editCustomSection">
                <button v-if="!showEditCustomForm" type="button" class="addCustomBtn" @click="showEditCustomForm = true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Tambah Item Custom
                </button>
                <div v-else class="customForm">
                  <div class="customFormFields">
                    <input v-model="editNewCustomName" class="formInput" placeholder="Nama item" />
                    <div class="customFormRow">
                      <input v-model.number="editNewCustomQty" class="formInput formInputSmall" type="number" min="1" placeholder="Qty" />
                      <input v-model.number="editNewCustomPrice" class="formInput" type="number" min="0" placeholder="Harga" />
                    </div>
                  </div>
                  <div class="customFormActions">
                    <button type="button" class="mb-btn" @click="showEditCustomForm = false">Batal</button>
                    <button type="button" class="mb-btnPrimary" @click="addEditCustomItem">Tambah</button>
                  </div>
                </div>
              </div>

              <div class="expenseSection">
                <div class="expenseHeader">
                  <span class="formLabel">Pengeluaran</span>
                  <span v-if="editExpenseTotal > 0" class="expenseTotal">Rp {{ rupiah(editExpenseTotal) }}</span>
                </div>
                <div v-if="editExpenses.length" class="expenseList">
                  <div v-for="(e, idx) in editExpenses" :key="'edit-exp-' + idx" class="expenseRow">
                    <span class="expenseName">{{ e.item_name }}</span>
                    <span class="expenseAmount">Rp {{ rupiah(e.amount) }}</span>
                    <button type="button" class="expenseRemove" @click="removeEditExpense(idx)">×</button>
                  </div>
                </div>

                <button v-if="!showEditExpenseForm" type="button" class="addCustomBtn" @click="showEditExpenseForm = true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Tambah Biaya Pengeluaran
                </button>
                <div v-else class="customForm">
                  <div class="customFormTitle">Biaya Pengeluaran</div>
                  <div class="customFormFields">
                    <input v-model="editNewExpenseName" class="formInput" placeholder="Nama biaya" />
                    <input v-model.number="editNewExpenseAmount" class="formInput" type="number" min="0" placeholder="Nominal" />
                  </div>
                  <div class="customFormActions">
                    <button type="button" class="mb-btn" @click="showEditExpenseForm = false">Batal</button>
                    <button type="button" class="mb-btnPrimary" @click="addEditExpense">Tambah</button>
                  </div>
                </div>
              </div>

              <div v-if="!editIsExpenseOnly" class="adjustmentRow">
                <label class="formField formFieldSmall">
                  <span class="formLabel">Diskon</span>
                  <input v-model.number="editDiscount" class="formInput" type="number" min="0" placeholder="0" />
                </label>
              </div>

              <div class="editTotalRow">
                <span>{{ editIsExpenseOnly ? "Total Pengeluaran:" : "Total:" }}</span>
                <strong>Rp {{ rupiah(editBottomTotal) }}</strong>
              </div>
            </div>

            <p v-if="editError" class="errorMsg">{{ editError }}</p>

            <div class="editActions">
              <button type="button" class="newTxBtn" :disabled="editSaving" @click="closeEditSale">
                Batal
              </button>
              <button type="button" class="printBtn" :disabled="editSaving" @click="saveEditSale">
                <template v-if="editSaving">
                  <div class="spinner light" />
                  <span>Menyimpan...</span>
                </template>
                <template v-else>
                  Simpan
                </template>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.salesPage {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 140px);
  padding-bottom: 100px;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.mobileTabBar {
  display: flex;
  gap: 8px;
  padding: 0 0 16px;
  position: sticky;
  top: 0;
  z-index: 10;
  background: transparent;
}

.tabBtn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 16px;
  border: 1px solid var(--mb-border2);
  border-radius: 14px;
  background: var(--mb-surface);
  color: var(--mb-muted);
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tabBtn.active {
  border-color: var(--mb-accent);
  background: rgba(52, 199, 89, 0.08);
  color: var(--mb-text);
}

.tabIcon {
  width: 20px;
  height: 20px;
}

.tabContent {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tabContent.hidden {
  display: none;
}

.searchSection {
  position: relative;
}

.searchWrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.searchIcon {
  position: absolute;
  left: 14px;
  width: 20px;
  height: 20px;
  color: var(--mb-muted);
  pointer-events: none;
}

.searchInput {
  width: 100%;
  height: 52px;
  padding: 0 44px 0 44px;
  border: 1px solid var(--mb-border);
  border-radius: 16px;
  background: var(--mb-surface);
  color: var(--mb-text);
  font-size: 16px;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
}

.searchInput:focus {
  border-color: var(--mb-accent);
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.15);
}

.clearBtn {
  position: absolute;
  right: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 10px;
  background: var(--mb-surface2);
  color: var(--mb-muted);
  cursor: pointer;
}

.clearBtn svg {
  width: 18px;
  height: 18px;
}

.searchResults {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  max-height: 60vh;
  overflow-y: auto;
  border: 1px solid var(--mb-border2);
  border-radius: 16px;
  background: var(--mb-surface);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
  z-index: 50;
}

.searchLoading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  color: var(--mb-muted);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--mb-border);
  border-top-color: var(--mb-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner.light {
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: white;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.productCard {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border: none;
  border-bottom: 1px solid var(--mb-border2);
  background: var(--mb-surface);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.productCard:last-child {
  border-bottom: none;
}

.productCard:active {
  background: rgba(52, 199, 89, 0.08);
}

.productCard:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.productInfo {
  min-width: 0;
}

.productName {
  font-weight: 700;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.productMeta {
  margin-top: 4px;
  font-size: 13px;
  color: var(--mb-muted);
}

.productRight {
  text-align: right;
}

.productPrice {
  font-weight: 800;
  font-size: 15px;
}

.productStock {
  margin-top: 4px;
  font-size: 12px;
  color: var(--mb-muted);
}

.productStock.low {
  color: #ff9500;
}

.addIcon {
  width: 24px;
  height: 24px;
  color: var(--mb-accent);
}

.noResults {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 16px;
  color: var(--mb-muted);
}

.noResults svg {
  width: 48px;
  height: 48px;
  opacity: 0.5;
}

.noResultsHint a {
  color: var(--mb-accent);
  font-weight: 600;
  text-decoration: none;
}

.cartSection {
  background: var(--mb-surface);
  border: 1px solid var(--mb-border2);
  border-radius: 16px;
  overflow: hidden;
}

.cartHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--mb-border2);
  background: var(--mb-surface2);
}

.cartTitle {
  font-weight: 800;
  font-size: 15px;
}

.cartBadge {
  padding: 4px 10px;
  border-radius: 20px;
  background: var(--mb-accent);
  color: white;
  font-weight: 700;
  font-size: 12px;
}

.cartItems {
  max-height: 40vh;
  overflow-y: auto;
}

.cartItem {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--mb-border2);
}

.cartItem:last-child {
  border-bottom: none;
}

.removeBtn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: rgba(215, 0, 21, 0.1);
  color: var(--mb-danger);
  cursor: pointer;
}

.removeBtn svg {
  width: 16px;
  height: 16px;
}

.cartItemInfo {
  min-width: 0;
}

.cartItemName {
  font-weight: 700;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cartItemMeta {
  margin-top: 2px;
  font-size: 12px;
  color: var(--mb-muted);
}

.qtyControl {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--mb-surface2);
  border-radius: 10px;
  padding: 4px;
}

.qtyBtn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: var(--mb-surface);
  color: var(--mb-text);
  cursor: pointer;
}

.qtyBtn:active {
  background: var(--mb-border2);
}

.qtyBtn svg {
  width: 16px;
  height: 16px;
}

.qtyValue {
  min-width: 32px;
  text-align: center;
  font-weight: 800;
  font-size: 15px;
}

.cartItemTotal {
  font-weight: 800;
  font-size: 14px;
  white-space: nowrap;
}

.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 20px;
  border: 1px dashed var(--mb-border2);
  border-radius: 14px;
  background: var(--mb-surface);
  color: var(--mb-muted);
  font-size: 14px;
}

.emptyState svg {
  width: 40px;
  height: 40px;
  opacity: 0.4;
}

.emptyHint {
  font-size: 13px;
}

.formSection {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--mb-surface);
  border: 1px solid var(--mb-border2);
  border-radius: 16px;
}

.formRow {
  display: grid;
  gap: 12px;
}

.formField {
  display: grid;
  gap: 6px;
}

.formLabel {
  font-size: 13px;
  font-weight: 600;
  color: var(--mb-muted);
}

.formInput {
  height: 48px;
  padding: 0 14px;
  border: 1px solid var(--mb-border);
  border-radius: 12px;
  background: var(--mb-surface);
  color: var(--mb-text);
  font-size: 16px;
  text-transform: uppercase;
  outline: none;
}

.formInput:focus {
  border-color: var(--mb-accent);
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.15);
}

.paymentGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.paymentBtn {
  padding: 12px 8px;
  border: 1px solid var(--mb-border);
  border-radius: 10px;
  background: var(--mb-surface);
  color: var(--mb-text);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.paymentBtn.active {
  border-color: var(--mb-accent);
  background: rgba(52, 199, 89, 0.1);
  color: var(--mb-accent);
}

.paymentBtn:active {
  transform: scale(0.97);
}

.paymentHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.splitToggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--mb-muted);
  cursor: pointer;
  user-select: none;
}

.splitToggle input {
  accent-color: var(--mb-accent);
}

.inputModeBar {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  min-height: 20px;
}

.inputModeChip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(52, 199, 89, 0.24);
  background: rgba(52, 199, 89, 0.1);
  color: var(--mb-accent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}

.inputModeChip:active {
  transform: scale(0.98);
}

.modeGrid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.modeCard {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 12px;
  min-height: 72px;
  padding: 12px 14px;
  border: 1px solid var(--mb-border2);
  border-radius: 16px;
  background: var(--mb-surface);
  color: var(--mb-text);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.modeCard:active {
  transform: scale(0.99);
}

.modeCard.active {
  border-color: rgba(52, 199, 89, 0.35);
  background: linear-gradient(180deg, rgba(52, 199, 89, 0.18), rgba(52, 199, 89, 0.08));
  box-shadow: inset 0 0 0 1px rgba(52, 199, 89, 0.18);
}

.modeCardIcon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid var(--mb-border2);
  background: rgba(255, 255, 255, 0.03);
  color: var(--mb-muted);
}

.modeCard.active .modeCardIcon {
  border-color: rgba(52, 199, 89, 0.3);
  color: var(--mb-accent);
  background: rgba(52, 199, 89, 0.12);
}

.modeCardIcon svg {
  width: 20px;
  height: 20px;
}

.modeCardContent {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.modeCardTitle {
  font-size: 14px;
  font-weight: 800;
}

.modeCardDesc {
  font-size: 12px;
  line-height: 1.4;
  color: var(--mb-muted);
}

.stockReceiptSection {
  display: grid;
  gap: 12px;
  margin-bottom: 12px;
  padding: 14px;
  border: 1px solid var(--mb-border2);
  border-radius: 16px;
  background: var(--mb-surface2);
}

.stockReceiptHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.stockReceiptTitle {
  font-weight: 800;
  font-size: 15px;
}

.stockReceiptMeta {
  font-size: 12px;
  color: var(--mb-muted);
}

.stockReceiptMeta.strong {
  font-weight: 700;
  color: var(--mb-text);
}

.stockReceiptTextarea {
  min-height: 168px;
  height: auto;
  padding: 14px;
  text-transform: none;
  line-height: 1.55;
  font-size: 15px;
  font-family: "Consolas", "SFMono-Regular", "Liberation Mono", monospace;
  resize: vertical;
}

.stockReceiptTextarea::placeholder {
  color: rgba(255, 255, 255, 0.38);
  text-transform: none;
}

.stockReceiptErrorList {
  display: grid;
  gap: 8px;
}

.stockReceiptErrorItem {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(215, 0, 21, 0.2);
  background: rgba(215, 0, 21, 0.08);
  color: var(--mb-danger);
  font-size: 12px;
  font-weight: 600;
}

.stockReceiptPreview {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(52, 199, 89, 0.24);
  border-radius: 14px;
  background: rgba(52, 199, 89, 0.08);
}

.stockReceiptPreviewHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  font-weight: 800;
  color: var(--mb-accent);
}

.stockReceiptPreviewList {
  display: grid;
  gap: 8px;
}

.stockReceiptPreviewRow {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: start;
  gap: 10px;
}

.stockReceiptPreviewQty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(52, 199, 89, 0.14);
  color: var(--mb-accent);
  font-size: 12px;
  font-weight: 700;
}

.stockReceiptPreviewName {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}

.inputModePopoverOverlay {
  position: fixed;
  inset: 0;
  z-index: 220;
  background: transparent;
}

.inputModePopover {
  position: fixed;
  width: min(360px, calc(100vw - 24px));
  max-height: min(78vh, 560px);
  overflow-y: auto;
  padding: 18px;
  border: 1px solid var(--mb-border2);
  border-radius: 20px;
  background: var(--mb-surface);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
  transform-origin: var(--mode-popover-origin-x, 28px) 0;
  display: grid;
  gap: 16px;
}

.inputModeSheetHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.inputModeSheetTitle {
  font-size: 18px;
  font-weight: 900;
}

.inputModeSheetSub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--mb-muted);
}

.splitPaymentBox {
  padding: 12px;
  border: 1px solid var(--mb-border2);
  border-radius: 14px;
  background: var(--mb-surface2);
  display: grid;
  gap: 10px;
}

.splitPaymentRow {
  display: flex;
  align-items: center;
  gap: 10px;
}

.splitSelect {
  flex: 1;
}

.splitAmount {
  width: 120px;
  flex-shrink: 0;
}

.splitRemove {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
  cursor: pointer;
}

.splitPaymentActions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.splitPaymentSummary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--mb-muted);
}

.splitPaymentSummary.bad {
  color: var(--mb-danger);
}

.expenseSection {
  display: grid;
  gap: 10px;
}

.expenseHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.expenseTotal {
  font-size: 12px;
  font-weight: 700;
  color: var(--mb-muted);
}

.expenseList {
  display: grid;
  gap: 8px;
}

.expenseRow {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--mb-border2);
  border-radius: 12px;
  background: var(--mb-surface2);
}

.expenseName {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 700;
  font-size: 13px;
}

.expenseAmount {
  font-weight: 700;
  font-size: 13px;
  white-space: nowrap;
  color: var(--mb-muted);
}

.expenseRemove {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
  font-size: 16px;
  cursor: pointer;
}

.errorMsg {
  margin: 0;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(215, 0, 21, 0.1);
  color: var(--mb-danger);
  font-size: 14px;
  font-weight: 600;
}

.historyHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.historyTitle {
  font-weight: 800;
  font-size: 18px;
}

.historySearchBar {
  margin-bottom: 8px;
}

.dailySummaryPanel {
  margin-bottom: 12px;
  padding: 10px;
  border: 1px solid var(--mb-border2);
  border-radius: 14px;
  background: var(--mb-surface2);
}

.dailySummaryGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.dailySumItem {
  display: grid;
  gap: 4px;
  padding: 10px;
  border-radius: 10px;
  background: var(--mb-surface);
  border: 1px solid var(--mb-border2);
}

.dailySumItemStrong {
  background: rgba(52, 199, 89, 0.1);
  border-color: rgba(52, 199, 89, 0.35);
}

.dailySumLabel {
  display: block;
  font-size: 11px;
  color: var(--mb-muted);
  letter-spacing: 0.2px;
}


.stockReceiptHistorySection {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
}

.stockReceiptHistoryHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.stockReceiptHistoryTitle {
  font-weight: 800;
  font-size: 16px;
}

.stockReceiptHistoryMeta {
  font-size: 12px;
  color: var(--mb-muted);
}

.stockReceiptHistoryList {
  display: grid;
  gap: 10px;
}

.stockReceiptCard {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid var(--mb-border2);
  border-radius: 14px;
  background: var(--mb-surface);
}

.stockReceiptCardHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.stockReceiptCardActions {
  display: grid;
  justify-items: end;
  gap: 8px;
}

.stockReceiptBadgeRow {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.stockReceiptBadge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(52, 199, 89, 0.14);
  color: var(--mb-accent);
  font-size: 12px;
  font-weight: 800;
}

.stockReceiptCardTotal {
  font-size: 16px;
  font-weight: 900;
}

.stockReceiptDeleteBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(215, 0, 21, 0.18);
  border-radius: 999px;
  background: rgba(215, 0, 21, 0.08);
  color: var(--mb-danger);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.stockReceiptDeleteBtn svg {
  width: 14px;
  height: 14px;
}

.stockReceiptCardItems {
  display: grid;
  gap: 6px;
}

.stockReceiptItemLine {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
}
.dailySumValue {
  display: block;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.25;
  word-break: break-word;
}

.historySearchWrap {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 48px;
  padding: 0 14px;
  border: 1px solid var(--mb-border2);
  border-radius: 14px;
  background: var(--mb-surface);
}

.historySearchIcon {
  width: 18px;
  height: 18px;
  color: var(--mb-muted);
  flex: none;
}

.historySearchInput {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--mb-text);
  font-size: 15px;
}

.historyClearBtn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--mb-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.historyClearBtn svg {
  width: 18px;
  height: 18px;
}

.refreshBtn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--mb-border);
  border-radius: 12px;
  background: var(--mb-surface);
  color: var(--mb-text);
  cursor: pointer;
}

.refreshIcon {
  width: 20px;
  height: 20px;
}

.refreshIcon.spinning {
  animation: spin 1s linear infinite;
}

.loadingState {
  display: grid;
  gap: 12px;
}

.salesList {
  display: grid;
  gap: 10px;
}

.saleCard {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--mb-border2);
  border-radius: 14px;
  background: var(--mb-surface);
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: all 0.15s ease;
}

.saleCard:focus-visible {
  outline: 3px solid rgba(52, 199, 89, 0.25);
  outline-offset: 2px;
}

.saleCard:active {
  background: var(--mb-surface2);
  transform: scale(0.99);
}

.saleInfo {
  min-width: 0;
}

.saleItemsTop {
  display: grid;
  gap: 2px;
}

.saleItemLineTop {
  font-weight: 700;
  font-size: 14px;
  line-height: 1.3;
  white-space: normal;
  overflow: hidden;
  text-overflow: clip;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.saleItemMoreTop {
  font-size: 12px;
  color: var(--mb-muted);
}

.saleMeta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--mb-muted);
}

.salePlateBadge {
  padding: 2px 8px;
  border-radius: 999px;
  background: #111;
  color: #fff;
  font-weight: 800;
  font-size: 11px;
  line-height: 1.4;
  white-space: nowrap;
}

.salePayment {
  padding: 2px 6px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid var(--mb-border2);
  font-weight: 500;
  font-size: 11px;
  white-space: nowrap;
}

.saleExpenseOnly {
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(255, 149, 0, 0.14);
  color: #9b5a00;
  font-weight: 700;
  font-size: 11px;
}

.salePrinted {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.05);
  font-weight: 600;
  font-size: 11px;
}

.saleRight {
  text-align: right;
  min-width: 88px;
}

.saleTotal {
  font-weight: 800;
  font-size: 16px;
}

.saleActions {
  display: grid;
  justify-items: end;
  gap: 6px;
  margin-top: 4px;
}

.printLabel {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  font-size: 12px;
  color: var(--mb-accent);
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.printLabel svg {
  width: 14px;
  height: 14px;
}

.editLabel {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 12px;
  color: var(--mb-muted);
  font-weight: 700;
  cursor: pointer;
}

.editLabel svg {
  width: 14px;
  height: 14px;
}

.editLabel:hover {
  color: var(--mb-text);
}

.deleteLabel {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 12px;
  color: var(--mb-danger);
  font-weight: 700;
  cursor: pointer;
  opacity: 0.7;
}

.deleteLabel svg {
  width: 13px;
  height: 13px;
}

.deleteLabel:hover {
  opacity: 1;
}

.deleteSheet {
  width: 100%;
  max-width: 400px;
  padding: 32px 24px;
  padding-bottom: max(32px, env(safe-area-inset-bottom));
  background: var(--mb-surface);
  border-radius: 24px 24px 0 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.deleteSheetIcon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(215, 0, 21, 0.1);
  color: var(--mb-danger);
  margin-bottom: 8px;
}

.deleteSheetIcon svg {
  width: 28px;
  height: 28px;
}

.deleteSheetTitle {
  font-weight: 900;
  font-size: 20px;
}

.deleteSheetSub {
  color: var(--mb-muted);
  font-size: 14px;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deleteSheetActions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;
  width: 100%;
}

.deleteConfirmBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  border: none;
  border-radius: 14px;
  background: var(--mb-danger);
  color: white;
  font-weight: 800;
  font-size: 15px;
  cursor: pointer;
}

.deleteConfirmBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 420px) {
  .dailySummaryGrid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .saleCard {
    grid-template-columns: 1fr;
  }

  .saleMeta {
    flex-wrap: wrap;
    row-gap: 6px;
  }

  .salePlateBadge {
    max-width: 60vw;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .saleRight {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
  }

  .saleTotal {
    font-size: 15px;
  }

  .saleActions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 0;
  }

  .detailMetaGrid,
  .detailActions,
  .detailAdminActions {
    grid-template-columns: 1fr;
  }

  .detailRow {
    grid-template-columns: 1fr;
  }

  .detailRowPrice {
    text-align: left;
  }

  .editSheet .searchInput {
    height: 44px;
    font-size: 14px;
  }

  .editSheet .formInput {
    height: 42px;
    font-size: 14px;
  }

  .editSheet .paymentBtn {
    padding: 10px 6px;
    font-size: 12px;
  }

  .editItemRow {
    grid-template-columns: 1fr auto auto auto;
    gap: 6px;
    font-size: 12px;
  }

  .editItemRow .qtyBtn {
    width: 28px;
    height: 28px;
  }
}

.emptyHistory {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 20px;
  color: var(--mb-muted);
}

.emptyHistory svg {
  width: 56px;
  height: 56px;
  opacity: 0.4;
}

.bottomBar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background: var(--mb-glass-surface-strong);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--mb-border2);
  z-index: 100;
}

.totalSection {
  flex: 1;
  min-width: 0;
}

.totalLabel {
  display: block;
  font-size: 12px;
  color: var(--mb-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.totalValue {
  display: block;
  font-weight: 900;
  font-size: 20px;
  margin-top: 2px;
}

.submitBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 140px;
  height: 52px;
  padding: 0 24px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(180deg, var(--mb-accent), var(--mb-accent2));
  color: var(--mb-accent-ink);
  font-weight: 800;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.submitBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submitBtn.is-loading:disabled {
  opacity: 1;
  cursor: progress;
}

.submitBtn:not(:disabled):active {
  transform: scale(0.97);
}

.submitBtn svg {
  width: 22px;
  height: 22px;
}

.successOverlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  z-index: 200;
  padding: 0;
}

.successSheet {
  width: 100%;
  max-width: 400px;
  padding: 32px 24px;
  padding-bottom: max(32px, env(safe-area-inset-bottom));
  background: var(--mb-surface);
  border-radius: 24px 24px 0 0;
  text-align: center;
}

.detailSheet {
  width: 100%;
  max-width: 460px;
  max-height: 92vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 20px;
  padding-bottom: max(24px, env(safe-area-inset-bottom));
  background: var(--mb-surface);
  border-radius: 24px 24px 0 0;
}

.detailSheetHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.detailTitle {
  font-size: 20px;
  font-weight: 900;
}

.detailSub {
  margin-top: 4px;
  color: var(--mb-muted);
  font-size: 12px;
}

.detailCloseBtn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--mb-border2);
  border-radius: 12px;
  background: var(--mb-surface2);
  color: var(--mb-text);
  cursor: pointer;
  flex: none;
}

.detailCloseBtn svg {
  width: 18px;
  height: 18px;
}

.detailMetaGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.detailMetaCard {
  display: grid;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--mb-border2);
  border-radius: 14px;
  background: var(--mb-surface2);
}

.detailMetaLabel {
  font-size: 11px;
  color: var(--mb-muted);
}

.detailMetaCard strong {
  font-size: 13px;
  line-height: 1.35;
}

.detailBlock {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid var(--mb-border2);
  border-radius: 14px;
  background: var(--mb-surface2);
}

.detailBlockTitle {
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 800;
  color: var(--mb-muted);
  letter-spacing: 0.2px;
  text-transform: uppercase;
}

.detailRow {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--mb-border2);
}

.detailRow:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.detailRowMain {
  min-width: 0;
}

.detailRowTitle {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
}

.detailRowMeta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--mb-muted);
}

.detailRowPrice {
  text-align: right;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 800;
}

.detailRowPrice span {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--mb-muted);
}

.detailSimpleRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--mb-border2);
  font-size: 14px;
}

.detailSimpleRow:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.detailSimpleRowDanger strong {
  color: var(--mb-danger);
}

.detailSummaryCard {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid var(--mb-border2);
  border-radius: 14px;
  background: var(--mb-surface);
}

.detailSummaryRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  font-size: 14px;
}

.detailSummaryRowStrong {
  font-size: 15px;
  font-weight: 800;
}

.detailSummaryRowDanger strong {
  color: var(--mb-danger);
}

.detailPrintInfo {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--mb-border2);
  font-size: 12px;
  color: var(--mb-muted);
}

.detailActions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 18px;
}

.detailAdminActions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 10px;
}

.editDetailBtn,
.deleteDetailBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 46px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.editDetailBtn {
  border: 1px solid var(--mb-border);
  background: var(--mb-surface2);
  color: var(--mb-text);
}

.deleteDetailBtn {
  border: 1px solid rgba(215, 0, 21, 0.18);
  background: rgba(215, 0, 21, 0.08);
  color: var(--mb-danger);
}

.editDetailBtn svg,
.deleteDetailBtn svg {
  width: 16px;
  height: 16px;
}

.editSheet {
  width: 100%;
  max-width: 420px;
  max-height: 92vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 24px 20px;
  padding-bottom: max(24px, env(safe-area-inset-bottom));
  background: var(--mb-surface);
  border-radius: 24px 24px 0 0;
}

.editTitle {
  text-align: center;
  font-weight: 900;
  font-size: 20px;
}

.editSub {
  margin-top: 6px;
  text-align: center;
  color: var(--mb-muted);
  font-size: 12px;
}

.editForm {
  margin-top: 16px;
}

.editSearchSection .searchResults {
  position: relative;
  top: 8px;
  max-height: 40vh;
  box-shadow: none;
  border-radius: 12px;
}

.editActions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 18px;
}

.successIcon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(52, 199, 89, 0.15);
  color: var(--mb-accent);
}

.successIcon svg {
  width: 32px;
  height: 32px;
}

.successTitle {
  font-weight: 900;
  font-size: 22px;
}

.successSub {
  margin-top: 8px;
  color: var(--mb-muted);
}

.successActions {
  display: grid;
  gap: 10px;
  margin-top: 24px;
}

.printBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 52px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(180deg, var(--mb-accent), var(--mb-accent2));
  color: white;
  font-weight: 800;
  font-size: 16px;
  cursor: pointer;
}

.printBtn svg {
  width: 22px;
  height: 22px;
}

.newTxBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 48px;
  border: 1px solid var(--mb-border);
  border-radius: 14px;
  background: var(--mb-surface);
  color: var(--mb-text);
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
}

.newTxBtn svg {
  width: 20px;
  height: 20px;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: all 0.3s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .successSheet,
.sheet-leave-to .successSheet,
.sheet-enter-from .detailSheet,
.sheet-leave-to .detailSheet,
.sheet-enter-from .editSheet,
.sheet-leave-to .editSheet {
  transform: translateY(100%);
}

.mode-popover-enter-active,
.mode-popover-leave-active {
  transition: opacity 0.18s ease;
}

.mode-popover-enter-active .inputModePopover,
.mode-popover-leave-active .inputModePopover {
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.mode-popover-enter-from,
.mode-popover-leave-to {
  opacity: 0;
}

.mode-popover-enter-from .inputModePopover,
.mode-popover-leave-to .inputModePopover {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}

.customItemSection {
  margin-top: 12px;
}

.addCustomBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 16px;
  border: 1px dashed var(--mb-border2);
  border-radius: 14px;
  background: transparent;
  color: var(--mb-muted);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.addCustomBtn:hover {
  border-color: var(--mb-accent);
  color: var(--mb-accent);
}

.addCustomBtn svg {
  width: 18px;
  height: 18px;
}

.customForm {
  padding: 16px;
  border: 1px solid var(--mb-border2);
  border-radius: 14px;
  background: var(--mb-surface);
}

.customFormTitle {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 12px;
}

.customFormFields {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.customFormRow {
  display: flex;
  gap: 10px;
}

.formInputSmall {
  width: 80px;
  flex-shrink: 0;
}

.customFormActions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.customCartItem {
  background: rgba(52, 199, 89, 0.04);
}

.adjustmentRow {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.formFieldSmall {
  flex: 1;
}

.historyHeaderActions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.allDatesToggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--mb-muted);
  cursor: pointer;
}

.allDatesToggle input {
  accent-color: var(--mb-accent);
}

.saleDateBadge {
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: var(--mb-muted);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.saleTime {
  white-space: nowrap;
}

.saleDiscount {
  color: #ff3b30;
  font-size: 11px;
}

.saleService {
  color: var(--mb-accent);
  font-size: 11px;
}

.saleExpensesDetail {
  margin-top: 6px;
  display: grid;
  gap: 2px;
}

.saleExpenseDetailRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--mb-muted);
}

.saleExpenseDetailName {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.saleExpenseDetailAmount {
  white-space: nowrap;
  color: #ff3b30;
  font-weight: 600;
}

.editItemsList {
  margin-top: 16px;
  padding: 12px;
  background: var(--mb-surface2);
  border-radius: 12px;
}

.editItemsTitle {
  font-size: 12px;
  font-weight: 700;
  color: var(--mb-muted);
  margin-bottom: 8px;
}

.editItemRow {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--mb-border2);
  font-size: 13px;
}

.editItemRow:last-child {
  border-bottom: none;
}

.editItemName {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editQtyControls {
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--mb-surface);
  border-radius: 8px;
  padding: 2px;
  flex-shrink: 0;
}

.editItemQty {
  color: var(--mb-muted);
  font-size: 12px;
}

.editItemPrice {
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.editItemRemove {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
  font-size: 16px;
  cursor: pointer;
}

.editCustomSection {
  margin-top: 16px;
}

.editTotalRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0 0;
  border-top: 1px solid var(--mb-border2);
  margin-top: 16px;
  font-size: 16px;
}

.editTotalRow strong {
  font-size: 18px;
  color: var(--mb-accent);
}

@media (min-width: 768px) {
  .dailySummaryGrid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .salesPage {
    max-width: 600px;
    margin: 0 auto;
    padding-bottom: 120px;
  }

  .bottomBar {
    left: 50%;
    transform: translateX(-50%);
    max-width: 600px;
    border-radius: 20px 20px 0 0;
  }

  .successSheet {
    border-radius: 24px;
    margin-bottom: 20px;
  }

  .detailSheet {
    border-radius: 24px;
    margin-bottom: 20px;
  }

  .editSheet {
    border-radius: 24px;
    margin-bottom: 20px;
    max-height: 90vh;
    overflow-y: auto;
  }
}

@media (min-width: 1024px) {
  .salesPage {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    max-width: 1100px;
    padding-bottom: 120px;
  }

  .mobileTabBar {
    display: none;
  }

  .tabContent {
    display: flex !important;
  }

  .tabContent.hidden {
    display: flex !important;
  }

  .bottomBar {
    max-width: 1100px;
  }
}

@media (max-width: 900px) {
  .salesPage {
    padding-bottom: 196px;
  }

  .bottomBar {
    left: 12px;
    right: 12px;
    bottom: calc(90px + env(safe-area-inset-bottom));
    transform: none;
    max-width: none;
    padding-bottom: 12px;
    border: 1px solid var(--mb-border2);
    border-radius: 16px;
    z-index: 19;
  }

  .submitBtn {
    min-width: 128px;
    padding: 0 18px;
  }
}
</style>
