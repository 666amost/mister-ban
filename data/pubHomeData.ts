import type { NavGroup, HeroMetric, ProductLine, TechCard, BrandCatalog } from "~/types/public"

export const navGroups: NavGroup[] = [
  {
    id: "produk",
    label: "Brand",
    eyebrow: "Pilihan Merek",
    title: "Empat brand ban terpercaya tersedia di semua cabang Mister Ban.",
    description: "Pilih brand yang sesuai kebutuhan motor Anda, lalu kunjungi cabang terdekat untuk cek stok dan ukuran.",
    items: [
      { label: "Kingland Tiger", href: "#produk", meta: "Ban motor untuk jalanan kota" },
      { label: "IRC SS-530R", href: "#produk", meta: "Pilihan ban harian yang familiar" },
      { label: "Maxxis MA-3Di", href: "#produk", meta: "Ketahanan lebih lama untuk motor matic" },
      { label: "Zeneos ZN77", href: "#produk", meta: "Pilihan harga kompetitif" },
    ],
  },
  {
    id: "teknologi",
    label: "Layanan",
    eyebrow: "Layanan Kami",
    title: "Ban berkualitas untuk motor harian dengan pilihan brand yang sudah terpercaya.",
    description: "Kami menyediakan berbagai ukuran dan brand ban motor untuk kebutuhan penggantian rutin maupun perjalanan lebih jauh.",
    items: [
      { label: "Kingland, IRC, Maxxis, Zeneos", href: "#teknologi", meta: "Empat brand tersedia" },
      { label: "Stok Tersedia", href: "#jaringan", meta: "Hubungi cabang untuk cek stok" },
      { label: "Harga Bersaing", href: "#jaringan", meta: "Tanya langsung ke toko" },
    ],
  },
  {
    id: "jaringan",
    label: "Cabang",
    eyebrow: "Cabang Kami",
    title: "Tujuh cabang aktif di area Jakarta Barat dan Tangerang siap melayani Anda.",
    description: "Kunjungi atau hubungi cabang Mister Ban terdekat untuk menanyakan stok, ukuran, dan harga ban.",
    items: [
      { label: "Dunia Ban Kedoya", href: "#jaringan", meta: "Area Kedoya, Jakarta Barat" },
      { label: "Mister Ban Meruya", href: "#jaringan", meta: "Area Meruya, Jakarta Barat" },
      { label: "Gemilang Ban Ciledug", href: "#jaringan", meta: "Area Ciledug, Tangerang" },
    ],
  },
]

export const tapeWords: string[] = [
  "Spesialis Ban Motor",
  "Kingland Tiger",
  "IRC SS-530R",
  "Maxxis MA-3Di",
  "Zeneos ZN77",
  "FDR",
  "Pirelli",
  "Michelin",
  "Aspira",
  "Bridgestone",
  "Dunlop",
  "Cek Stok ke Toko",
]

export const stageLinePaths: string[] = [
  "M -120 150 C 120 20 330 30 510 150 S 890 360 1420 120",
  "M -120 195 C 140 65 350 75 530 195 S 910 405 1420 165",
  "M -120 240 C 160 110 370 120 550 240 S 930 450 1420 210",
  "M -120 285 C 180 155 390 165 570 285 S 950 495 1420 255",
  "M -120 330 C 200 200 410 210 590 330 S 970 540 1420 300",
  "M -120 375 C 220 245 430 255 610 375 S 990 585 1420 345",
  "M -120 420 C 240 290 450 300 630 420 S 1010 630 1420 390",
  "M -120 465 C 260 335 470 345 650 465 S 1030 675 1420 435",
]

export const stageAccentPaths: string[] = [
  "M -120 360 C 140 220 360 230 560 320 S 920 430 1420 250",
  "M -120 460 C 170 320 410 330 640 430 S 1000 540 1420 350",
]

export const heroMetrics: HeroMetric[] = [
  { value: "4 Brand", label: "Kingland, IRC, Maxxis, dan Zeneos tersedia di semua cabang." },
  { value: "7 Cabang", label: "Aktif melayani di Jakarta Barat dan Tangerang." },
  { value: "Stok Tersedia", label: "Hubungi cabang terdekat untuk cek stok dan harga." },
]

export const techCards: TechCard[] = [
  {
    title: "15 brand tersedia",
    description: "Kingland, IRC, Maxxis, Zeneos, Pirelli, Michelin, FDR, dan lebih banyak pilihan lainnya.",
  },
  {
    title: "Cek stok & ukuran",
    description: "Hubungi cabang terdekat untuk menanyakan ketersediaan ukuran dan harga terkini.",
  },
  {
    title: "Melayani Jakarta & Tangerang",
    description: "Mister Ban hadir di tujuh titik layanan aktif di Jakarta Barat dan Tangerang.",
  },
]

export const branchFallbacks = [
  { title: "Dunia Ban Kedoya", area: "Kedoya", instagram: "@dunia_ban_kedoya" },
  { title: "Dunia Ban Kembangan", area: "Kembangan", instagram: "@dunia_ban_kembangan" },
  { title: "Mister Ban Meruya", area: "Meruya", instagram: "@misterbanmotor" },
  { title: "Mister Ban Karang Tengah", area: "Karang Tengah", instagram: "@misterbanmotor" },
  { title: "Mister Ban Gondrong", area: "Gondrong", instagram: "@m2tc.misterban.gondrong" },
  { title: "Gemilang Ban Paninggilan", area: "Paninggilan", instagram: "@m2tc.gemilangban.paninggilan" },
  { title: "Gemilang Ban Ciledug", area: "Ciledug", instagram: "@m2tc.gemilangban.ciledugindah" },
]

export const productLines: ProductLine[] = [
  {
    id: "kingland-tiger",
    serial: "01",
    brand: "Kingland",
    name: "Kingland Tiger",
    series: "Urban City",
    tagline: "Ban motor untuk jalanan kota dengan grip stabil di berbagai kondisi.",
    fitment: "Motor matic & bebek",
    summary: "Kingland Tiger Urban City dirancang untuk motor matic dan bebek yang aktif di jalanan kota. Tersedia dalam berbagai ukuran standar, cocok untuk kebutuhan harian maupun perjalanan lebih jauh.",
    features: ["Tersedia dalam berbagai ukuran standar.", "Cocok untuk motor matic dan bebek."],
    metrics: [
      { label: "Brand", value: "Kingland" },
      { label: "Tipe", value: "TT / TL" },
      { label: "Kategori", value: "Urban" },
    ],
    imageAlt: "Foto ban Kingland Tiger",
    stagePalette: {
      accent: "#24c466",
      accentRgb: "36, 196, 102",
      accentSoft: "#7de89d",
      surfaceFrom: "#052314",
      surfaceTo: "#0d3f24",
      surfaceGlow: "#177c42",
    },
    imagePath: "/brand/brand/kingland-tiger.png",
  },
  {
    id: "irc-ss-530r",
    serial: "02",
    brand: "IRC",
    name: "IRC SS-530R",
    series: "Sport Series",
    tagline: "Pilihan ban harian yang sudah dipercaya untuk berbagai motor.",
    fitment: "Motor matic & bebek",
    summary: "IRC SS-530R memberikan grip yang konsisten untuk pemakaian harian. Salah satu pilihan ban paling sering dicari di cabang Mister Ban, tersedia dalam banyak ukuran.",
    features: ["Grip stabil di jalan kering dan basah.", "Mudah ditemukan di semua cabang."],
    metrics: [
      { label: "Brand", value: "IRC" },
      { label: "Tipe", value: "TT / TL" },
      { label: "Kategori", value: "Harian" },
    ],
    imageAlt: "Foto ban IRC SS-530R",
    stagePalette: {
      accent: "#19b85f",
      accentRgb: "25, 184, 95",
      accentSoft: "#74e79b",
      surfaceFrom: "#052314",
      surfaceTo: "#0b3921",
      surfaceGlow: "#126d3a",
    },
    imagePath: "/brand/brand/IRC-SS-530r.png",
  },
  {
    id: "maxxis-ma-3di",
    serial: "03",
    brand: "Maxxis",
    name: "Maxxis MA-3Di",
    series: "Diamond Scooter",
    tagline: "Ketahanan lebih lama untuk motor matic dengan pemakaian intensif.",
    fitment: "Motor matic",
    summary: "Maxxis MA-3Di memberikan performa konsisten untuk motor matic yang digunakan setiap hari. Pilihan dari brand Maxxis yang sudah dikenal untuk ketahanan dan kenyamanan berkendara.",
    features: ["Daya tahan lebih lama dari pemakaian rutin.", "Performa konsisten untuk jarak jauh."],
    metrics: [
      { label: "Brand", value: "Maxxis" },
      { label: "Tipe", value: "TL" },
      { label: "Kategori", value: "Durable" },
    ],
    imageAlt: "Foto ban Maxxis MA-3Di",
    stagePalette: {
      accent: "#2fd173",
      accentRgb: "47, 209, 115",
      accentSoft: "#8af0ad",
      surfaceFrom: "#061f13",
      surfaceTo: "#0f4227",
      surfaceGlow: "#1b8549",
    },
    imagePath: "/brand/brand/Maxxis-Ma-3Di.png",
  },
  {
    id: "zeneos-zn77",
    serial: "04",
    brand: "Zeneos",
    name: "Zeneos ZN77",
    series: "Advanced Grip",
    tagline: "Pilihan ban motor harian dengan harga yang kompetitif.",
    fitment: "Motor matic",
    summary: "Zeneos ZN77 menawarkan performa ban harian yang baik dengan harga terjangkau. Tersedia di semua cabang Mister Ban untuk kebutuhan penggantian rutin.",
    features: ["Harga kompetitif untuk penggantian rutin.", "Tersedia di semua cabang."],
    metrics: [
      { label: "Brand", value: "Zeneos" },
      { label: "Tipe", value: "TL" },
      { label: "Kategori", value: "Value" },
    ],
    imageAlt: "Foto ban Zeneos ZN77",
    stagePalette: {
      accent: "#13a957",
      accentRgb: "19, 169, 87",
      accentSoft: "#69df91",
      surfaceFrom: "#041f12",
      surfaceTo: "#0a351f",
      surfaceGlow: "#116d38",
    },
    imagePath: "/brand/brand/Zeneos-zn77.png",
  },
]

export const brandCatalog: BrandCatalog[] = [
  {
    id: "kingland-tiger",
    name: "Kingland",
    types: [
      { type: "Tiger", sizes: ["70/90-14", "70/90-17", "80/90-14", "80/90-17", "90/90-14", "110/70-13", "130/70-13"] },
      { type: "RTX05", sizes: ["120/70-13", "120/70-14", "140/70-13", "140/70-14"] },
      { type: "Hydra", sizes: ["90/80-14", "100/80-14"] },
      { type: "Tiger/Jaguar", sizes: ["100/90-12", "110/90-12"] },
      { type: "CRT", sizes: ["90/90-12"] },
    ],
  },
  {
    id: "irc-ss-530r",
    name: "IRC",
    types: [
      { type: "RX01", sizes: ["100/80-17", "110/70-17", "120/70-17", "130/70-17", "140/70-17"] },
      { type: "MB67", sizes: ["110/90-12"] },
      { type: "NR83 / Ecotrax", sizes: ["110/90-12"] },
      { type: "NR82", sizes: ["80/80-14", "100/70-14", "100/90-12"] },
      { type: "SS560 / SCT007", sizes: ["120/70-14", "130/70-13"] },
      { type: "Fasti 2", sizes: ["90/80-14", "90/80-17"] },
      { type: "Fasti Pro", sizes: ["80/80-14", "90/80-14"] },
      { type: "NR93", sizes: ["70/90-17", "80/90-17"] },
      { type: "SCT005", sizes: ["110/80-14", "140/70-14"] },
      { type: "SS530", sizes: ["80/90-14", "90/90-14"] },
    ],
  },
  {
    id: "maxxis-ma-3di",
    name: "Maxxis",
    types: [
      { type: "Victra", sizes: ["70/90-14", "70/90-17", "80/90-14", "80/90-17", "100/80-14", "100/90-14", "110/70-12", "110/70-13", "110/70-14", "120/70-12", "120/70-13", "120/70-14", "130/70-12", "130/70-13", "130/70-14", "140/70-13", "140/70-14", "150/60-13", "150/70-14"] },
      { type: "Extramaxx", sizes: ["80/90-14", "90/90-14", "100/80-17", "110/70-17", "120/70-17", "130/70-17", "140/70-17", "150/60-17", "160/60-17"] },
      { type: "TR4 (Tube)", sizes: ["2.25/2.50-14", "2.25/2.50-17", "2.50/2.75-14", "2.50/2.75-17", "2.75/3.00-14", "2.75/3.00-17"] },
      { type: "Victra CT", sizes: ["100/90-12", "110/90-12", "130/80-12", "150/60-17", "160/60-17"] },
      { type: "Tubetype M6167H", sizes: ["70/90-14", "80/90-14", "90/90-14"] },
      { type: "M6240", sizes: ["120/80-17", "130/80-17", "140/80-17"] },
      { type: "Diamond", sizes: ["80/80-14"] },
      { type: "Green Devil", sizes: ["100/80-17"] },
    ],
  },
  {
    id: "zeneos-zn77",
    name: "Zeneos",
    types: [
      { type: "ZN62", sizes: ["80/80-14", "90/80-14", "90/80-17", "100/80-14", "110/70-14", "110/80-14", "120/70-14", "140/70-14"] },
      { type: "ZN77", sizes: ["70/90-14", "70/90-17", "80/90-14", "80/90-17", "90/90-14", "90/90-17"] },
      { type: "Milano", sizes: ["110/70-11", "110/70-12", "120/70-10", "120/70-12", "140/70-13"] },
      { type: "Ionity", sizes: ["100/90-12", "110/70-13", "110/90-12", "130/70-13", "130/80-12"] },
      { type: "ZN88", sizes: ["70/90-16", "80/90-16", "100/70-14"] },
      { type: "ZN61", sizes: ["80/90-14"] },
    ],
  },
  {
    id: "fdr",
    name: "FDR",
    types: [
      { type: "SportXREvo", sizes: ["100/80-14", "110/70-13", "120/70-14", "130/70-13"] },
      { type: "MP27", sizes: ["90/80-14", "100/80-14"] },
      { type: "CityGo", sizes: ["100/90-12", "110/90-12"] },
      { type: "Flemmino", sizes: ["80/90-14", "90/90-14"] },
      { type: "Flemmo Pro", sizes: ["70/90-17", "80/90-17"] },
      { type: "Genzi Pro", sizes: ["80/80-14", "90/80-14"] },
    ],
  },
  {
    id: "pirelli",
    name: "Pirelli",
    types: [
      { type: "Diablo Rosso", sizes: ["80/90-14", "90/80-14", "90/90-14", "100/80-14", "110/70-13", "120/70-13", "120/70-14", "130/70-13", "140/70-13"] },
      { type: "Corsa II", sizes: ["90/80-14"] },
    ],
  },
  {
    id: "michelin",
    name: "Michelin",
    types: [
      { type: "Pilot Street", sizes: ["80/90-14", "90/90-14", "100/80-14", "120/70-13", "140/70-13"] },
      { type: "Pilot Street 2", sizes: ["110/70-13", "130/70-13"] },
    ],
  },
  {
    id: "aspira",
    name: "Aspira",
    types: [
      { type: "Maxio SPR40TL", sizes: ["100/80-14", "100/90-12", "110/90-12"] },
      { type: "Maxio SPR38TL", sizes: ["80/90-14", "90/90-14"] },
      { type: "RS01", sizes: ["90/80-14"] },
    ],
  },
  {
    id: "swallow",
    name: "Swallow",
    types: [
      { type: "Seahawk", sizes: ["70/90-14", "80/90-14", "90/90-14"] },
      { type: "Slash", sizes: ["110/70-13"] },
    ],
  },
  {
    id: "tomimoto",
    name: "Tomimoto",
    types: [
      { type: "TM100", sizes: ["100/80-14", "110/70-13", "130/70-14"] },
      { type: "TM300", sizes: ["80/90-14", "90/90-14"] },
      { type: "TM150", sizes: ["110/80-14"] },
    ],
  },
  {
    id: "federal",
    name: "Federal",
    types: [
      { type: "K59A12", sizes: ["80/90-14", "90/90-14", "100/90-12"] },
    ],
  },
  {
    id: "corsa",
    name: "Corsa",
    types: [
      { type: "R46", sizes: ["90/80-14"] },
    ],
  },
  {
    id: "deli-tire",
    name: "Deli Tire",
    types: [],
  },
  {
    id: "dunlop",
    name: "Dunlop",
    types: [],
  },
  {
    id: "bridgestone",
    name: "Bridgestone",
    types: [],
  },
]
