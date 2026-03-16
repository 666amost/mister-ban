type ProductCategorySqlOptions = {
  brandExpr: string;
  productNameExpr: string;
  productTypeExpr: string;
};

const TIRE_BRAND_KEYWORDS: ReadonlyArray<string> = [
  "zeneos",
  "irc",
  "aspira",
  "fdr",
  "swallow",
  "honda",
  "kingland",
  "michelin",
  "pirelli",
  "corsa",
];

const SPAREPART_BRANDS: ReadonlyArray<string> = ["disc pad", "disc"];

const SPAREPART_PRODUCT_TYPES: ReadonlyArray<string> = [
  "laher",
  "kampas",
  "kampas rem",
  "bearing",
  "gear",
  "rantai",
  "busi",
  "onderdil",
  "spare part",
];

const LIQUID_BRANDS: ReadonlyArray<string> = ["iml", "cairan"];

const NON_TIRE_BRANDS: ReadonlyArray<string> = [
  "ban dalam",
  "oli",
  "disc pad",
  "disc",
  "iml",
  "cairan",
];

function quoteSqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function buildSqlInList(values: ReadonlyArray<string>): string {
  return values.map(quoteSqlLiteral).join(", ");
}

function buildContainsCondition(expr: string, keyword: string): string {
  return `${expr} LIKE '%${keyword.replace(/'/g, "''")}%'`;
}

function lowerTrim(expr: string): string {
  return `LOWER(TRIM(${expr}))`;
}

function lower(expr: string): string {
  return `LOWER(${expr})`;
}

function upperTrim(expr: string): string {
  return `UPPER(TRIM(${expr}))`;
}

const sparepartBrandsSql = buildSqlInList(SPAREPART_BRANDS);
const sparepartProductTypesSql = buildSqlInList(SPAREPART_PRODUCT_TYPES);
const liquidBrandsSql = buildSqlInList(LIQUID_BRANDS);
const nonTireBrandsSql = buildSqlInList(NON_TIRE_BRANDS);

export function buildProductCategoryCaseSql({
  brandExpr,
  productNameExpr,
  productTypeExpr,
}: ProductCategorySqlOptions): string {
  const brandSql = lowerTrim(brandExpr);
  const productNameSql = lower(productNameExpr);
  const productTypeLowerSql = lowerTrim(productTypeExpr);
  const productTypeUpperSql = upperTrim(productTypeExpr);
  const tireBrandConditions: ReadonlyArray<string> = [
    ...TIRE_BRAND_KEYWORDS.map((keyword: string) => buildContainsCondition(brandSql, keyword)),
    `(${buildContainsCondition(brandSql, "maxxis")} AND ${brandSql} NOT LIKE '%tube%')`,
    `${productTypeUpperSql} = 'BAN'`,
  ];

  return `
    CASE
      WHEN ${brandSql} = 'oli'
           OR ${productTypeUpperSql} = 'OLI'
      THEN 'OLI'
      WHEN ${brandSql} IN (${sparepartBrandsSql})
           OR ${productTypeUpperSql} = 'SPAREPART'
           OR ${productTypeLowerSql} IN (${sparepartProductTypesSql})
      THEN 'SPAREPART'
      WHEN ${brandSql} IN (${liquidBrandsSql})
           OR ${productNameSql} LIKE '%cairan%'
           OR ${productTypeLowerSql} = 'cairan'
      THEN 'CAIRAN'
      WHEN ${brandSql} = 'ban dalam'
           OR ${productNameSql} LIKE '%ban dalam%'
           OR ${productNameSql} LIKE '%tube%'
           OR ${productTypeLowerSql} LIKE 'tr%'
      THEN 'BAN_DALAM'
      WHEN (${tireBrandConditions.join("\n            OR ")})
           AND ${brandSql} NOT IN (${nonTireBrandsSql})
           AND ${brandSql} NOT LIKE '%tube%'
           AND ${productNameSql} NOT LIKE '%ban dalam%'
           AND ${productNameSql} NOT LIKE '%tube%'
      THEN 'BAN'
      ELSE 'BAN'
    END
  `.trim();
}
