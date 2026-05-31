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
