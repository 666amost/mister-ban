import type { MotorFitment, MotorCategory } from "~/types/public"

export const motorFitments: MotorFitment[] = [
  { id: "beat", name: "Honda Beat", aliases: ["beat", "honda beat", "beat esp", "beat street"], category: "matic", front: "80/90-14", rear: "90/90-14" },
  { id: "vario-125", name: "Honda Vario 125", aliases: ["vario 125", "vario125", "vario 125 esp"], category: "matic", front: "80/90-14", rear: "90/90-14" },
  { id: "vario-150", name: "Honda Vario 150", aliases: ["vario 150", "vario150", "vario 150 esp"], category: "matic", front: "80/90-14", rear: "100/80-14" },
  { id: "vario-160", name: "Honda Vario 160", aliases: ["vario 160", "vario160"], category: "matic", front: "100/80-14", rear: "120/70-14" },
  { id: "scoopy", name: "Honda Scoopy", aliases: ["scoopy", "honda scoopy", "scoopy esp"], category: "matic", front: "80/90-14", rear: "90/90-14" },
  { id: "genio", name: "Honda Genio", aliases: ["genio", "honda genio"], category: "matic", front: "80/90-14", rear: "90/90-14" },
  { id: "pcx-160", name: "Honda PCX 160", aliases: ["pcx", "pcx 160", "pcx160", "honda pcx", "pcx 125", "pcx 150"], category: "matic", front: "100/80-14", rear: "120/70-14" },
  { id: "adv-160", name: "Honda ADV 160", aliases: ["adv", "adv 160", "adv160", "honda adv", "adv 150"], category: "matic", front: "110/80-14", rear: "140/70-14" },
  { id: "mio-m3", name: "Yamaha Mio M3", aliases: ["mio", "mio m3", "mio 125", "yamaha mio", "mio m3 125"], category: "matic", front: "70/90-14", rear: "80/90-14" },
  { id: "mio-soul-gt", name: "Yamaha Mio Soul GT", aliases: ["mio soul", "soul gt", "mio soul gt", "soul gt 125"], category: "matic", front: "70/90-14", rear: "80/90-14" },
  { id: "fino-125", name: "Yamaha Fino 125", aliases: ["fino", "fino 125", "yamaha fino", "fino sporty"], category: "matic", front: "80/90-14", rear: "90/90-14" },
  { id: "lexi-125", name: "Yamaha Lexi 125", aliases: ["lexi", "lexi 125", "yamaha lexi"], category: "matic", front: "80/90-14", rear: "90/90-14" },
  { id: "nmax", name: "Yamaha NMAX 155", aliases: ["nmax", "n-max", "yamaha nmax", "nmax 155", "nmax 125", "nmax turbo"], category: "matic", front: "110/70-13", rear: "130/70-13" },
  { id: "aerox", name: "Yamaha Aerox 155", aliases: ["aerox", "aerox 155", "yamaha aerox", "aerox s"], category: "matic", front: "110/70-13", rear: "130/70-13" },
  { id: "freego", name: "Yamaha Freego", aliases: ["freego", "yamaha freego", "freego s"], category: "matic", front: "110/70-13", rear: "130/70-13" },
  { id: "nex-ii", name: "Suzuki Nex II", aliases: ["nex", "nex ii", "nex 2", "suzuki nex", "nex cross"], category: "matic", front: "70/90-14", rear: "80/90-14" },
  { id: "address", name: "Suzuki Address 110", aliases: ["address", "suzuki address", "address 110", "address fi"], category: "matic", front: "80/90-14", rear: "90/90-14" },
  { id: "revo", name: "Honda Revo", aliases: ["revo", "honda revo", "revo fit", "revo x", "revo 110"], category: "bebek", front: "70/90-17", rear: "80/90-17" },
  { id: "blade", name: "Honda Blade 110", aliases: ["blade", "honda blade", "repsol blade", "blade 110"], category: "bebek", front: "70/90-17", rear: "80/90-17" },
  { id: "supra-x-125", name: "Honda Supra X 125", aliases: ["supra", "supra x", "supra x 125", "supra 125", "supra x fi"], category: "bebek", front: "70/90-17", rear: "80/90-17" },
  { id: "supra-gtr", name: "Honda Supra GTR 150", aliases: ["supra gtr", "supra gtr 150", "supra gtr150", "supra gtr 150i"], category: "bebek", front: "80/90-17", rear: "90/90-17" },
  { id: "sonic-150", name: "Honda Sonic 150R", aliases: ["sonic", "sonic 150", "sonic 150r", "honda sonic"], category: "bebek", front: "80/90-17", rear: "90/90-17" },
  { id: "jupiter-z1", name: "Yamaha Jupiter Z1", aliases: ["jupiter", "jupiter z1", "jupiter z", "yamaha jupiter", "jupiter z1 125"], category: "bebek", front: "70/90-17", rear: "80/90-17" },
  { id: "mx-king", name: "Yamaha MX King 150", aliases: ["mx king", "mxking", "mx king 150", "mx-king", "mx king 155"], category: "bebek", front: "100/80-17", rear: "120/70-17" },
  { id: "satria-f150", name: "Suzuki Satria F150", aliases: ["satria", "satria f", "satria f150", "satria f 150", "satria fu"], category: "bebek", front: "80/90-17", rear: "90/90-17" },
  { id: "r15", name: "Yamaha R15", aliases: ["r15", "yamaha r15", "r15 v3", "r15 v4", "yzf-r15", "r15 155cc"], category: "sport", front: "100/80-17", rear: "140/70-17" },
  { id: "mt-15", name: "Yamaha MT-15", aliases: ["mt15", "mt 15", "yamaha mt-15", "mt-15 155", "yamaha mt15"], category: "sport", front: "100/80-17", rear: "140/70-17" },
  { id: "vixion-r", name: "Yamaha Vixion R", aliases: ["vixion", "v-ixion", "yamaha vixion", "vixion r", "vixion lightning", "vixion r 150"], category: "sport", front: "100/80-17", rear: "120/70-17" },
  { id: "cbr150r", name: "Honda CBR150R", aliases: ["cbr150", "cbr 150", "cbr150r", "honda cbr", "cbr 150r"], category: "sport", front: "100/80-17", rear: "130/70-17" },
  { id: "cb150r", name: "Honda CB150R Streetfire", aliases: ["cb150", "cb 150", "cb150r", "cb 150r", "streetfire", "cb150 streetfire"], category: "sport", front: "100/80-17", rear: "130/70-17" },
  { id: "ninja-250sl", name: "Kawasaki Ninja 250 SL", aliases: ["ninja 250", "ninja250", "ninja 250sl", "kawasaki ninja", "ninja sl", "kawasaki ninja 250"], category: "sport", front: "100/80-17", rear: "130/70-17" },
]

export const motorCategoryLabels: Record<MotorCategory, string> = {
  matic: "Motor Matic",
  bebek: "Motor Bebek",
  sport: "Motor Sport",
}

export type SizeHint = {
  label: string
  front: string
  rear: string
}

export const sizeHints: SizeHint[] = [
  { label: "Matic 110–125cc (Beat, Vario 125, Fino, Scoopy)", front: "80/90-14", rear: "90/90-14" },
  { label: "Matic kecil (Mio M3, Nex II, Soul GT)", front: "70/90-14", rear: "80/90-14" },
  { label: "Matic 150cc (Vario 150)", front: "80/90-14", rear: "100/80-14" },
  { label: "Matic 160cc (PCX 160, Vario 160)", front: "100/80-14", rear: "120/70-14" },
  { label: "Matic adventure (ADV 160)", front: "110/80-14", rear: "140/70-14" },
  { label: "Matic 13\" premium (NMAX, Aerox 155)", front: "110/70-13", rear: "130/70-13" },
  { label: "Bebek standar (Revo, Jupiter Z1, Supra X 125)", front: "70/90-17", rear: "80/90-17" },
  { label: "Bebek sport (Supra GTR 150, Satria F150, Sonic)", front: "80/90-17", rear: "90/90-17" },
  { label: "Bebek performan (MX King 150)", front: "100/80-17", rear: "120/70-17" },
  { label: "Sport 155cc (R15, MT-15)", front: "100/80-17", rear: "140/70-17" },
  { label: "Sport 150cc (CBR150R, CB150R, Ninja 250 SL)", front: "100/80-17", rear: "130/70-17" },
]
