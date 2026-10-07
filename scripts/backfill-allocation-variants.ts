import 'dotenv/config';
import prisma from '@/lib/prisma.server';
import { fetchShopifyOrderById } from '@/lib/shopify-order-fetch.server';
import { findVariantForLine } from '@/lib/inventory-allocation.server';
import { takeStock } from '@/lib/inventory-stock.server';

/**
 * One-off repair for `InventoryAllocation` rows created before order lines carried the Shopify
 * variant id — allocation matched hub variants by SKU only, so lines whose store and hub variants
 * had no SKU got `variantId: null` and never moved stock (inventory stayed "full").
 *
 * For each ALLOCATED unmatched row: re-fetch the order from Shopify for the line's variant id,
 * resolve the hub variant through the publish-time store-variant mapping (SKU fallback), then
 * link the row and bump the variant's `allocated` with the same GREATEST(0, …) clamp the webhook
 * path uses. FULFILLED unmatched rows get the same link plus the physical deduction their
 * fulfilment skipped (the units shipped but never left stock). RELEASED rows are left alone —
 * a released commitment never touched stock, so there is nothing to reconstruct.
 *
 * Run with: npx tsx scripts/backfill-allocation-variants.ts
 */
async function main() {
  const rows = await prisma.inventoryAllocation.findMany({
    where: { variantId: null, state: { in: ['ALLOCATED', 'FULFILLED'] } },
    select: { id: true, storeId: true, shopifyOrderId: true, orderNumber: true, lineItemId: true, sku: true, quantity: true, state: true, fulfilledQuantity: true, releasedQuantity: true, refundedQuantity: true },
  });
  if (rows.length === 0) {
    console.log('No unmatched allocation rows to backfill.');
    return;
  }

  const stores = await prisma.store.findMany({
    where: { id: { in: rows.map((r) => r.storeId) }, accessToken: { not: null } },
    select: { id: true, storeDomain: true, accessToken: true },
  });
  const storeById = new Map(stores.map((s) => [s.id, s]));

  let linked = 0;
  let unresolved = 0;
  for (const row of rows) {
    const store = storeById.get(row.storeId);
    if (!store) {
      console.log(`Skipped order #${row.orderNumber ?? row.shopifyOrderId} line ${row.lineItemId}: store has no access token.`);
      unresolved++;
      continue;
    }

    let variantId: string | null = null;
    try {
      // Old payloads carry no variant id — re-fetch the order for the line's current one.
      const order = await fetchShopifyOrderById({ shop: store.storeDomain, accessToken: store.accessToken!, orderId: row.shopifyOrderId });
      const line = order.line_items?.find((li) => String(li.id) === row.lineItemId);
      variantId = await prisma.$transaction((tx) => findVariantForLine(tx, row.storeId, line?.variant_id ?? null, row.sku));
    } catch (error) {
      console.error(`Order fetch failed for order #${row.orderNumber ?? row.shopifyOrderId}:`, error instanceof Error ? error.message : error);
    }

    if (!variantId) {
      console.log(`Unresolved: order #${row.orderNumber ?? row.shopifyOrderId} line ${row.lineItemId} (sku ${row.sku ?? '—'}) — no hub variant match.`);
      unresolved++;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.inventoryAllocation.update({ where: { id: row.id }, data: { variantId } });

      if (row.state === 'FULFILLED') {
        // Refunds never recorded against an unmatched row, so refundedQuantity is 0 here —
        // deduct the fulfilled units, which shipped without ever leaving stock.
        const shipped = Math.max(0, row.fulfilledQuantity - row.refundedQuantity);
        if (shipped === 0) return;
        const taken = await takeStock(tx, variantId, shipped);
        if (!taken) return;
        const where = taken.length === 0 ? '' : ` · ${taken.map((l) => `${l.name} ${l.quantity}`).join(', ')}`;
        const variant = await tx.supplierProductVariant.findUniqueOrThrow({ where: { id: variantId }, select: { supplierProductId: true } });
        await tx.inventoryActivity.create({
          data: {
            supplierProductId: variant.supplierProductId,
            variantId,
            type: 'order_stock',
            message: `Backfilled link — fulfilled ${shipped} for order #${row.orderNumber ?? row.shopifyOrderId}${where}`,
            actorId: null,
            actorName: 'Backfill script',
          },
        });
        return;
      }

      const outstanding = Math.max(0, row.quantity - row.fulfilledQuantity - row.releasedQuantity);
      if (outstanding === 0) return;
      // Same clamped single-statement move as the webhook path (adjustVariantAllocated).
      await tx.$queryRaw`UPDATE "SupplierProductVariant" SET "allocated" = GREATEST(0, "allocated" + ${outstanding}), "updatedAt" = NOW() WHERE "id" = ${variantId}`;
      const variant = await tx.supplierProductVariant.findUniqueOrThrow({ where: { id: variantId }, select: { supplierProductId: true } });
      await tx.inventoryActivity.create({
        data: {
          supplierProductId: variant.supplierProductId,
          variantId,
          type: 'order_allocation',
          message: `Backfilled link — allocated ${outstanding} for order #${row.orderNumber ?? row.shopifyOrderId}`,
          actorId: null,
          actorName: 'Backfill script',
        },
      });
    });
    linked++;
    console.log(`Linked order #${row.orderNumber ?? row.shopifyOrderId} line ${row.lineItemId} (${row.state}) -> variant ${variantId}`);
  }

  console.log(`Done. ${linked} linked, ${unresolved} unresolved, ${rows.length} candidate(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
