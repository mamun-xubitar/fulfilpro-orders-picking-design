import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma.server';

type Tx = Prisma.TransactionClient;

const ACTOR = { id: null, name: 'Shopify webhook' };

/** Order-line shape common to both the REST-ish webhook payload and the GraphQL-derived
 * ShopifyOrderPayload the app already uses for orders/create and orders/updated. */
export type OrderLineItemInput = { id: string | number; sku?: string | null; quantity?: number | null };

export type FulfillmentLineInput = { lineItemId: string | number; quantity: number };

export type RefundLineInput = { lineItemId: string | number; quantity: number; restockType?: string | null };

/** Moves a hub variant's `allocated` counter by `delta`, clamped at 0, and logs the movement.
 * Never uses a bare `{ decrement }` — that can't clamp, and a webhook processed out of order
 * (e.g. a refund landing before its fulfillment) must never push the counter negative. */
async function adjustVariantAllocated(tx: Tx, variantId: string, delta: number, message: string) {
  const variant = await tx.supplierProductVariant.findUnique({ where: { id: variantId }, select: { allocated: true, supplierProductId: true } });
  if (!variant) return;
  const next = Math.max(0, variant.allocated + delta);
  await tx.supplierProductVariant.update({ where: { id: variantId }, data: { allocated: next } });
  await tx.inventoryActivity.create({
    data: { supplierProductId: variant.supplierProductId, variantId, type: 'order_allocation', message, actorId: ACTOR.id, actorName: ACTOR.name },
  });
}

async function adjustVariantStock(tx: Tx, variantId: string, delta: number, message: string) {
  const variant = await tx.supplierProductVariant.findUnique({ where: { id: variantId }, select: { stockOnHand: true, supplierProductId: true } });
  if (!variant) return;
  const next = Math.max(0, variant.stockOnHand + delta);
  await tx.supplierProductVariant.update({ where: { id: variantId }, data: { stockOnHand: next } });
  await tx.inventoryActivity.create({
    data: { supplierProductId: variant.supplierProductId, variantId, type: 'order_stock', message, actorId: ACTOR.id, actorName: ACTOR.name },
  });
}

/** Finds the hub variant a Shopify order line refers to — SKU string equality, the same join
 * SupplierProductModel already uses for its allocatedFromOrders hint (there is no variant-level
 * id on the order line items the app fetches from Shopify). A blank or unmatched SKU still gets
 * an InventoryAllocation row, just with `variantId: null` — nothing to move, but the order/line
 * is still on the books. */
async function findVariantBySku(tx: Tx, sku: string | null): Promise<string | null> {
  if (!sku) return null;
  const variant = await tx.supplierProductVariant.findFirst({ where: { sku }, select: { id: true } });
  return variant?.id ?? null;
}

/**
 * Allocates stock for a freshly created (or re-synced) order — one InventoryAllocation row per
 * line item, `allocated += quantity` on the matched hub variant. Idempotent per line: a line
 * that already has a ledger row is left untouched, so re-running this for an order whose lines
 * haven't changed (e.g. orders/updated with no line changes) allocates nothing twice. Lines
 * missing from the ledger — new lines added by an order edit — are allocated on this same call,
 * which is what makes this safe to call from both orders/create and orders/updated.
 */
export async function allocateForOrder(args: {
  storeId: string;
  localOrderId: string | null;
  shopifyOrderId: string;
  orderNumber: number | null;
  lineItems: OrderLineItemInput[];
}) {
  const { storeId, localOrderId, shopifyOrderId, orderNumber, lineItems } = args;

  for (const item of lineItems) {
    const lineItemId = String(item.id);
    const quantity = Math.max(0, Math.floor(Number(item.quantity ?? 0)));
    if (quantity === 0) continue;
    const sku = item.sku?.trim() || null;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryAllocation.findUnique({
        where: { storeId_shopifyOrderId_lineItemId: { storeId, shopifyOrderId, lineItemId } },
      });
      if (existing) return;

      const variantId = await findVariantBySku(tx, sku);
      await tx.inventoryAllocation.create({
        data: { storeId, orderId: localOrderId, shopifyOrderId, orderNumber, lineItemId, sku, variantId, quantity, state: 'ALLOCATED' },
      });
      if (variantId) {
        await adjustVariantAllocated(tx, variantId, quantity, `Allocated ${quantity} for order #${orderNumber ?? shopifyOrderId}`);
      }
    });
  }
}

/** Releases every still-outstanding (not yet fulfilled or released) unit on an order — used for
 * orders/cancelled. Rows already FULFILLED are untouched: cancelling an order after it shipped
 * doesn't put stock back, a refund/return does (see applyRefund). */
export async function releaseForOrder(args: { storeId: string; shopifyOrderId: string }) {
  const rows = await prisma.inventoryAllocation.findMany({ where: { storeId: args.storeId, shopifyOrderId: args.shopifyOrderId, state: 'ALLOCATED' } });

  for (const row of rows) {
    const outstanding = row.quantity - row.fulfilledQuantity - row.releasedQuantity;
    await prisma.$transaction(async (tx) => {
      await tx.inventoryAllocation.update({
        where: { id: row.id },
        data: { state: 'RELEASED', releasedQuantity: row.quantity - row.fulfilledQuantity },
      });
      if (row.variantId && outstanding > 0) {
        await adjustVariantAllocated(tx, row.variantId, -outstanding, `Released ${outstanding} — order #${row.orderNumber ?? row.shopifyOrderId} cancelled`);
      }
    });
  }
}

/** Deducts fulfilled quantity from stock and releases the matching allocation — orders/create put
 * the stock in `allocated`, fulfilment now moves it out of both `allocated` and `stockOnHand`.
 * Handles partial fulfilment: only the newly fulfilled units (capped at what's still outstanding
 * on the line) move, so re-delivering the same fulfillment webhook is a no-op. */
export async function applyFulfillment(args: { storeId: string; shopifyOrderId: string; lines: FulfillmentLineInput[] }) {
  for (const line of args.lines) {
    const lineItemId = String(line.lineItemId);
    const row = await prisma.inventoryAllocation.findUnique({
      where: { storeId_shopifyOrderId_lineItemId: { storeId: args.storeId, shopifyOrderId: args.shopifyOrderId, lineItemId } },
    });
    if (!row) continue;

    const outstanding = row.quantity - row.fulfilledQuantity - row.releasedQuantity;
    const qty = Math.min(Math.max(0, Math.floor(line.quantity)), Math.max(0, outstanding));
    if (qty === 0) continue;

    await prisma.$transaction(async (tx) => {
      const nextFulfilled = row.fulfilledQuantity + qty;
      await tx.inventoryAllocation.update({
        where: { id: row.id },
        data: { fulfilledQuantity: nextFulfilled, state: nextFulfilled >= row.quantity - row.releasedQuantity ? 'FULFILLED' : row.state },
      });
      if (row.variantId) {
        await adjustVariantAllocated(tx, row.variantId, -qty, `Fulfilled ${qty} — order #${row.orderNumber ?? row.shopifyOrderId}`);
        await adjustVariantStock(tx, row.variantId, -qty, `Fulfilled ${qty} — order #${row.orderNumber ?? row.shopifyOrderId}`);
      }
    });
  }
}

/** Reverses a fulfilment that Shopify itself cancelled (fulfillments/update -> status
 * "cancelled") — puts the units back into stock and back into allocated, since the order line is
 * still open and expected to ship again. */
export async function reverseFulfillment(args: { storeId: string; shopifyOrderId: string; lines: FulfillmentLineInput[] }) {
  for (const line of args.lines) {
    const lineItemId = String(line.lineItemId);
    const row = await prisma.inventoryAllocation.findUnique({
      where: { storeId_shopifyOrderId_lineItemId: { storeId: args.storeId, shopifyOrderId: args.shopifyOrderId, lineItemId } },
    });
    if (!row) continue;

    const qty = Math.min(Math.max(0, Math.floor(line.quantity)), row.fulfilledQuantity);
    if (qty === 0) continue;

    await prisma.$transaction(async (tx) => {
      const nextFulfilled = row.fulfilledQuantity - qty;
      await tx.inventoryAllocation.update({ where: { id: row.id }, data: { fulfilledQuantity: nextFulfilled, state: 'ALLOCATED' } });
      if (row.variantId) {
        await adjustVariantAllocated(tx, row.variantId, qty, `Fulfilment cancelled — ${qty} re-allocated for order #${row.orderNumber ?? row.shopifyOrderId}`);
        await adjustVariantStock(tx, row.variantId, qty, `Fulfilment cancelled — ${qty} restored for order #${row.orderNumber ?? row.shopifyOrderId}`);
      }
    });
  }
}

/** Restocks refunded units — refunds/create. Only lines Shopify actually restocks
 * (`restockType` other than "no_restock") move stock; a still-outstanding (not yet fulfilled)
 * portion of the line is also released from `allocated`, since a refunded line will never ship. */
export async function applyRefund(args: { storeId: string; shopifyOrderId: string; lines: RefundLineInput[] }) {
  for (const line of args.lines) {
    if (line.restockType === 'no_restock') continue;
    const lineItemId = String(line.lineItemId);
    const qty = Math.max(0, Math.floor(line.quantity));
    if (qty === 0) continue;

    const row = await prisma.inventoryAllocation.findUnique({
      where: { storeId_shopifyOrderId_lineItemId: { storeId: args.storeId, shopifyOrderId: args.shopifyOrderId, lineItemId } },
    });
    if (!row?.variantId) continue;

    const stillOutstanding = row.state === 'ALLOCATED' ? Math.min(qty, row.quantity - row.fulfilledQuantity - row.releasedQuantity) : 0;

    await prisma.$transaction(async (tx) => {
      await adjustVariantStock(tx, row.variantId!, qty, `Refunded ${qty} restocked — order #${row.orderNumber ?? row.shopifyOrderId}`);
      if (stillOutstanding > 0) {
        await tx.inventoryAllocation.update({ where: { id: row.id }, data: { releasedQuantity: { increment: stillOutstanding } } });
        await adjustVariantAllocated(tx, row.variantId!, -stillOutstanding, `Refunded ${stillOutstanding} released — order #${row.orderNumber ?? row.shopifyOrderId}`);
      }
    });
  }
}
