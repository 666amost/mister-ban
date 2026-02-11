import { tx } from "../../db/db";
import { badRequest } from "../../utils/http";
import { ensureBalances, lockBalances } from "./inventory.repo";

export async function adjustInventory({
  storeId,
  userId,
  productId,
  qtyDelta,
  unitCost,
  resetAvgCost,
  note,
}: {
  storeId: string;
  userId: string;
  productId: string;
  qtyDelta: number;
  unitCost?: number;
  resetAvgCost?: boolean;
  note?: string;
}) {
  return await tx(async (client) => {
    await ensureBalances(client, storeId, [productId]);
    const balances = await lockBalances(client, storeId, [productId]);
    const current = balances[0];
    if (!current) throw badRequest("Inventory balance not found");

    const newQty = current.qty_on_hand + qtyDelta;
    if (newQty < 0) throw badRequest("Stok tidak cukup");

    let newAvg = current.avg_unit_cost;
    if (resetAvgCost) {
      newAvg = 0;
    } else if (qtyDelta > 0) {
      const cost = unitCost ?? current.avg_unit_cost;
      const numerator =
        current.qty_on_hand * current.avg_unit_cost + qtyDelta * cost;
      const denom = current.qty_on_hand + qtyDelta;
      newAvg = denom === 0 ? 0 : Math.round(numerator / denom);
    }

    await client.query(
      `
        UPDATE inventory_balances
        SET qty_on_hand = $3, avg_unit_cost = $4, updated_at = now()
        WHERE store_id = $1 AND product_id = $2
      `,
      [storeId, productId, newQty, newAvg],
    );

    // inventory_ledger enforces qty_delta <> 0, so avg-cost-only reset is persisted
    // in inventory_balances without creating a ledger row.
    if (qtyDelta !== 0) {
      await client.query(
        `
          INSERT INTO inventory_ledger (
            store_id, product_id, txn_type, qty_delta, unit_cost, ref_type, ref_id, note, txn_at, created_by
          )
          VALUES ($1, $2, 'ADJUST', $3, $4, 'MANUAL_ADJUST', NULL, $5, now(), $6)
        `,
        [storeId, productId, qtyDelta, unitCost ?? null, note ?? null, userId],
      );
    }

    return {
      product_id: productId,
      qty_on_hand: newQty,
      avg_unit_cost: newAvg,
    };
  });
}
