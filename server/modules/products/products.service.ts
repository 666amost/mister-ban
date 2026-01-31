import { getPool } from "../../db/pool";
import { tx } from "../../db/db";
import { badRequest } from "../../utils/http";
import { ensureBalances } from "../inventory/inventory.repo";
import {
  attachProductToStore,
  createProduct,
  listStoreProducts,
  listMasterProducts as listMasterProductsRepo,
  setStoreProductActive,
  updateMasterProduct,
  updateStoreProduct,
  upsertBrand,
} from "./products.repo";

export async function listProductsForStore({
  storeId,
  q,
  limit,
  offset,
}: {
  storeId: string;
  q?: string;
  limit?: number;
  offset?: number;
}) {
  const safeLimit = limit ?? 50;
  const safeOffset = offset ?? 0;
  return await listStoreProducts(getPool(), storeId, {
    q,
    limit: safeLimit,
    offset: safeOffset,
  });
}

export async function listMasterProducts({
  q,
  limit,
  offset,
}: {
  q?: string;
  limit?: number;
  offset?: number;
}) {
  const safeLimit = limit ?? 50;
  const safeOffset = offset ?? 0;
  return await listMasterProductsRepo(getPool(), {
    q,
    limit: safeLimit,
    offset: safeOffset,
  });
}

export async function createProductForStore({
  storeId,
  userId,
  brand,
  productType,
  name,
  size,
  sku,
  sellPrice,
  initialQty,
  initialUnitCost,
  isActive,
}: {
  storeId: string;
  userId: string;
  brand: string;
  productType: string;
  name: string;
  size: string;
  sku: string;
  sellPrice: number;
  initialQty: number;
  initialUnitCost: number;
  isActive: boolean;
}) {
  try {
    return await tx(async (client) => {
      const brandId = await upsertBrand(client, brand);
      if (!brandId) throw badRequest("Brand gagal dibuat");

      const productId = await createProduct(client, {
        brandId,
        productType,
        name,
        size,
        sku,
        isActive,
      });
      if (!productId) throw badRequest("Product gagal dibuat");

      await attachProductToStore(client, {
        storeId,
        productId,
        sellPrice,
        isActive,
      });

      await client.query(
        `
          INSERT INTO inventory_balances (store_id, product_id, qty_on_hand, avg_unit_cost)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (store_id, product_id)
          DO UPDATE SET qty_on_hand = EXCLUDED.qty_on_hand, avg_unit_cost = EXCLUDED.avg_unit_cost, updated_at = now()
        `,
        [storeId, productId, initialQty, initialUnitCost],
      );

      if (initialQty > 0) {
        await client.query(
          `
            INSERT INTO inventory_ledger (
              store_id, product_id, txn_type, qty_delta, unit_cost, ref_type, ref_id, note, txn_at, created_by
            )
            VALUES ($1, $2, 'ADJUST', $3, $4, 'MANUAL_ADJUST', NULL, 'initial stock', now(), $5)
          `,
          [storeId, productId, initialQty, initialUnitCost, userId],
        );
      }

      return { product_id: productId };
    });
  } catch (error: unknown) {
    const e = error as { code?: string };
    if (e?.code === "23505") throw badRequest("SKU sudah digunakan");
    throw error;
  }
}

export async function attachProductToStoreForAdmin({
  storeId,
  productId,
  sellPrice,
  isActive,
}: {
  storeId: string;
  productId: string;
  sellPrice: number;
  isActive: boolean;
}) {
  try {
    await tx(async (client) => {
      await attachProductToStore(client, {
        storeId,
        productId,
        sellPrice,
        isActive,
      });
      await ensureBalances(client, storeId, [productId]);
    });
    return { ok: true };
  } catch (error: unknown) {
    const e = error as { code?: string };
    if (e?.code === "23503") throw badRequest("Produk tidak ditemukan");
    throw error;
  }
}

export async function updateStoreProductForStore({
  storeId,
  productId,
  sellPrice,
  isActive,
}: {
  storeId: string;
  productId: string;
  sellPrice: number;
  isActive?: boolean;
}) {
  const updated = await tx(async (client) =>
    updateStoreProduct(client, { storeId, productId, sellPrice, isActive }),
  );
  if (!updated) throw badRequest("Produk tidak ditemukan di toko ini");
  return updated;
}

export async function removeProductFromStoreForAdmin({
  storeId,
  productId,
}: {
  storeId: string;
  productId: string;
}) {
  const removed = await tx(async (client) =>
    setStoreProductActive(client, { storeId, productId, isActive: false }),
  );
  if (!removed) throw badRequest("Produk tidak ditemukan di toko ini");
  return { ok: true };
}

export async function updateMasterProductForAdmin({
  productId,
  name,
  size,
  productType,
  isActive,
}: {
  productId: string;
  name?: string;
  size?: string;
  productType?: string;
  isActive?: boolean;
}) {
  const updated = await tx(async (client) =>
    updateMasterProduct(client, { productId, name, size, productType, isActive }),
  );
  if (!updated) throw badRequest("Produk tidak ditemukan");
  return { item: updated };
}
