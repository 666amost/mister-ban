import { buildProductCategoryCaseSql } from "~/server/utils/product-category-sql"

const categorySql = buildProductCategoryCaseSql({ brandExpr: "b.name", productNameExpr: "p.name", productTypeExpr: "p.product_type" })

// The size picker and stock results expose the same active retail tire catalog.
export const publicTireFilterSql = `
  s.status = 'active'
  AND sp.status = 'active'
  AND p.status = 'active'
  AND sp.sell_price > 0
  AND (${categorySql}) = 'BAN'
  AND LOWER(COALESCE(p.name, '')) NOT LIKE '%contoh%'
  AND LOWER(COALESCE(p.product_type, '')) NOT LIKE '%contoh%'
  AND LOWER(COALESCE(p.sku, '')) NOT LIKE '%test%'
`
