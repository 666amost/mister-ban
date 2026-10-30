export type NavMenuItem = {
  label: string
  href: string
  meta: string
}

export type NavGroup = {
  id: string
  label: string
  eyebrow: string
  title: string
  description: string
  items: NavMenuItem[]
}

export type HeroMetric = {
  value: string
  label: string
}

export type ProductMetric = {
  label: string
  value: string
}

export type StagePalette = {
  accent: string
  accentRgb: string
  accentSoft: string
  surfaceFrom: string
  surfaceTo: string
  surfaceGlow: string
}

export type ProductLine = {
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

export type TechCard = {
  title: string
  description: string
}

export type PublicBranchCard = {
  title: string
  area: string
  instagram: string | null
}

export type BrandTypeRow = {
  type: string
  sizes: string[]
}

export type BrandCatalog = {
  id: string
  name: string
  types: BrandTypeRow[]
}

export type MotorCategory = "matic" | "bebek" | "sport"

export type MotorFitment = {
  id: string
  name: string
  aliases: string[]
  category: MotorCategory
  front: string
  rear: string
}

export type PublicStockStatus = "available" | "limited" | "contact"

export type PublicBranch = {
  code: string
  slug: string
  name: string
  address: string
  city: string
  operatingHours: string[]
  instagram: string | null
  whatsapp: string | null
  latitude: number | null
  longitude: number | null
  mapsUrl: string
}

export type PublicBranchesResponse = {
  branches: PublicBranch[]
  updatedAt: string
}

export type PublicRecommendedProduct = {
  key: string
  brand: string
  type: string
  size: string
  position: "front" | "rear" | "both" | "unspecified"
  availableBranchCount: number
  availability: Array<[branchCode: string, status: Exclude<PublicStockStatus, "contact">]>
}

export type PublicBranchRecommendation = {
  branchCode: string
  frontStatus: PublicStockStatus
  rearStatus: PublicStockStatus
  setStatus: PublicStockStatus
}

export type PublicRecommendationResponse = {
  motor: MotorFitment | null
  size?: string
  products: PublicRecommendedProduct[]
  branches: PublicBranchRecommendation[]
  updatedAt: string
}

export type PublicTireSizesResponse = {
  sizes: string[]
}
