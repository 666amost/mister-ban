type PublicBranchMeta = {
  instagram?: string
  whatsapp?: string
  latitude?: number
  longitude?: number
}

// Public contact metadata that is not part of the production stores table.
// Add verified WhatsApp numbers and coordinates here, keyed by the ERP store code.
// Values are deliberately optional: address-based Maps and Instagram remain the fallback.
const PUBLIC_BRANCH_META: Readonly<Record<string, PublicBranchMeta>> = {
  T1: { instagram: "@dunia_ban_kedoya" },
  T2: { instagram: "@misterbanmotor" },
  T3: { instagram: "@misterbanmotor" },
  T4: { instagram: "@m2tc.gemilangban.paninggilan" },
  T5: { instagram: "@m2tc.misterban.gondrong" },
  T6: { instagram: "@m2tc.gemilangban.ciledugindah" },
  T7: { instagram: "@dunia_ban_kembangan" },
  "GEMILANG BAN PL": {},
}

export type PublicStoreRow = {
  name: string
  code: string | null
  address: string | null
  city: string | null
  operating_hours: string | null
  status: "active" | "inactive" | null
  receipt_instagram_mode: "default" | "custom" | "hidden" | null
  receipt_instagram: string | null
}

export function normalizeStoreCode(code: string | null): string {
  return (code ?? "").trim().toUpperCase()
}

export function publicBranchMeta(code: string | null): PublicBranchMeta {
  return PUBLIC_BRANCH_META[normalizeStoreCode(code)] ?? {}
}

export function publicBranchSlug(name: string): string {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function buildMapsUrl(name: string, address: string): string {
  const query = [name, address].filter(Boolean).join(", ")
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function resolveInstagram(store: PublicStoreRow): string | null {
  if (store.receipt_instagram_mode === "hidden") return null
  if (store.receipt_instagram_mode === "custom" && store.receipt_instagram?.trim()) {
    return normalizeInstagram(store.receipt_instagram)
  }
  const fallback = publicBranchMeta(store.code).instagram
  return fallback ? normalizeInstagram(fallback) : null
}

function normalizeInstagram(value: string): string {
  const trimmed = value.trim()
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`
}

export function normalizeWhatsapp(value: string | undefined): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, "")
  if (!digits) return null
  if (digits.startsWith("0")) return `62${digits.slice(1)}`
  return digits
}
