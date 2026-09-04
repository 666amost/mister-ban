import { createError, getQuery, setResponseHeaders } from "h3"
import { defineCachedEventHandler } from "nitropack/runtime/internal/cache"
import { motorFitments } from "~/data/motorFitmentData"
import type {
  PublicBranchRecommendation,
  PublicRecommendationResponse,
  PublicRecommendedProduct,
  PublicStockStatus,
} from "~/types/public"
import { getPool } from "~/server/db/pool"
import { buildProductCategoryCaseSql } from "~/server/utils/product-category-sql"

type AvailabilityRow = {
  branch_code: string
  brand: string
  product_type: string
  size: string
  stock_status: "available" | "limited"
  stock_updated_at: string | null
}

const publicProductCategorySql = buildProductCategoryCaseSql({
  brandExpr: "b.name",
  productNameExpr: "p.name",
  productTypeExpr: "p.product_type",
})

const statusRank: Record<PublicStockStatus, number> = {
  contact: 0,
  limited: 1,
  available: 2,
}

function bestStatus(current: PublicStockStatus, next: PublicStockStatus): PublicStockStatus {
  return statusRank[next] > statusRank[current] ? next : current
}

function setStatus(front: PublicStockStatus, rear: PublicStockStatus): PublicStockStatus {
  if (front === "contact" || rear === "contact") return "contact"
  return front === "available" && rear === "available" ? "available" : "limited"
}

export default defineCachedEventHandler(
  async (event): Promise<PublicRecommendationResponse> => {
    setResponseHeaders(event, {
      "Cache-Control": "public, max-age=30, s-maxage=300, stale-while-revalidate=600",
      "CDN-Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      "Vercel-CDN-Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    })

    const query = getQuery(event)
    const motorId = typeof query.motorId === "string" ? query.motorId.trim() : ""
    const motor = motorFitments.find((item) => item.id === motorId)
    if (!motor) {
      throw createError({ statusCode: 400, statusMessage: "Model motor tidak dikenali" })
    }

    const sizes = [...new Set([motor.front, motor.rear])]
    const { rows } = await getPool().query<AvailabilityRow>(
      `
        SELECT
          COALESCE(NULLIF(TRIM(s.code), ''), s.id::text) AS branch_code,
          TRIM(b.name) AS brand,
          COALESCE(NULLIF(TRIM(p.product_type), ''), NULLIF(TRIM(p.name), ''), 'Ban') AS product_type,
          TRIM(p.size) AS size,
          CASE
            WHEN MAX(COALESCE(ib.qty_on_hand, 0)) >= 3 THEN 'available'
            ELSE 'limited'
          END AS stock_status,
          MAX(ib.updated_at) AS stock_updated_at
        FROM store_products sp
        JOIN stores s ON s.id = sp.store_id
        JOIN products p ON p.id = sp.product_id
        JOIN brands b ON b.id = p.brand_id
        LEFT JOIN inventory_balances ib
          ON ib.store_id = sp.store_id
         AND ib.product_id = sp.product_id
        WHERE s.status = 'active'
          AND sp.status = 'active'
          AND p.status = 'active'
          AND sp.sell_price > 0
          AND p.size = ANY($1::text[])
          AND (${publicProductCategorySql}) = 'BAN'
          AND LOWER(p.name) NOT LIKE '%contoh%'
          AND LOWER(p.product_type) NOT LIKE '%contoh%'
          AND LOWER(p.sku) NOT LIKE '%test%'
        GROUP BY s.id, s.code, b.name, p.product_type, p.name, p.size
        HAVING MAX(COALESCE(ib.qty_on_hand, 0)) > 0
        ORDER BY LOWER(TRIM(b.name)), LOWER(TRIM(p.product_type)), TRIM(p.size), branch_code
      `,
      [sizes],
    )

    const productMap = new Map<
      string,
      {
        product: Omit<PublicRecommendedProduct, "availableBranchCount" | "availability">
        branchStatuses: Map<string, "available" | "limited">
      }
    >()
    const branchMap = new Map<string, { front: PublicStockStatus; rear: PublicStockStatus }>()
    let updatedAt = ""

    for (const row of rows) {
      const position =
        motor.front === motor.rear
          ? "both"
          : row.size === motor.front
            ? "front"
            : "rear"
      const key = `${row.brand}|${row.product_type}|${row.size}`
      const branchCode = row.branch_code.trim().toUpperCase()
      const productEntry = productMap.get(key)
      if (productEntry) {
        const currentStatus = productEntry.branchStatuses.get(branchCode)
        if (!currentStatus || row.stock_status === "available") {
          productEntry.branchStatuses.set(branchCode, row.stock_status)
        }
      } else {
        productMap.set(key, {
          product: {
            key,
            brand: row.brand,
            type: row.product_type,
            size: row.size,
            position,
          },
          branchStatuses: new Map([[branchCode, row.stock_status]]),
        })
      }

      const branch = branchMap.get(branchCode) ?? { front: "contact", rear: "contact" }
      if (position === "front" || position === "both") {
        branch.front = bestStatus(branch.front, row.stock_status)
      }
      if (position === "rear" || position === "both") {
        branch.rear = bestStatus(branch.rear, row.stock_status)
      }
      branchMap.set(branchCode, branch)

      if (row.stock_updated_at && row.stock_updated_at > updatedAt) updatedAt = row.stock_updated_at
    }

    const branches: PublicBranchRecommendation[] = [...branchMap.entries()].map(
      ([branchCode, status]) => ({
        branchCode,
        frontStatus: status.front,
        rearStatus: status.rear,
        setStatus: setStatus(status.front, status.rear),
      }),
    )

    return {
      motor,
      products: [...productMap.values()].slice(0, 64).map(({ product, branchStatuses }) => ({
        ...product,
        availableBranchCount: branchStatuses.size,
        availability: [...branchStatuses.entries()],
      })),
      branches,
      updatedAt: updatedAt || new Date().toISOString(),
    }
  },
  {
    maxAge: 60 * 5,
    swr: true,
    name: "public-recommendations-v2",
    getKey: (event) => {
      const query = getQuery(event)
      return typeof query.motorId === "string" ? query.motorId : "invalid"
    },
  },
)
