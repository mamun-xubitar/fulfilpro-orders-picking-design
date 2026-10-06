import { Prisma } from '@prisma/client';
import type { Prisma as PrismaTypes } from '@prisma/client';
import prisma from '@/lib/prisma.server';
import { addStock, takeStock } from '@/lib/inventory-stock.server';

type Tx = PrismaTypes.TransactionClient;

const ACTOR = { id: null, name: 'Shopify webhook' };

/** Order-line shape common to both the REST-ish webhook payload and the GraphQL-derived
 * ShopifyOrderPayload the app already uses for orders/create and orders/updated. */
export type OrderLineItemInput = { id: string | number; sku?: string | null; quantity?: number | null };

export type FulfillmentLineInput = { lineItemId: string | number; quantity: number };

export type RefundLineInput = { lineItemId: string | number; quantity: number; restockType?: string | null };

type RestockKind = 'CANCEL' | 'RETURN' | 'LEGACY' | 'NO_RESTOCK';

/**
 * Normalizes Shopify's REST `restock_type` (lowercase: `cancel`, `return`,
 * `no_restock`, `legacy_restock`) and GraphQL enum (uppercase) into one kind.
 * Missing/unknown values are conservative: release the outstanding commitment
 * but never move physical stock (CANCEL behaviour) unless the caller passes an
 * explicit top-level `restock === false`, which forces NO_RESTOCK.
 */
function normalizeRestockType(raw: string | null | undefined, topLevelRestock?: boolean | null): RestockKind {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'no_restock' || v === 'no-restock' || v === 'none') return 'NO_RESTOCK';
  if (v === 'return') return 'RETURN';
  if (v === 'cancel' || v === 'cancelled' || v === 'canceled') return 'CANCEL';
  if (v === 'legacy_restock' || v === 'legacy' || v === 'restock') return 'LEGACY';
  if (v === '') return topLevelRestock === false ? 'NO_RESTOCK' : 'CANCEL';
  return 'CANCEL';
}

/** Moves a hub variant's `allocated` counter by `delta`, clamped at 0, and logs the movement.
 * Single atomic UPDATE (no read-then-write gap): concurrent webhook deliveries touching
 * the same variant can't clobber each other's moves. A bare `{ decrement }` can't clamp,
 * and a webhook processed out of order (e.g. a refund landing before its fulfillment)
 * must never push the counter negative — hence GREATEST(0, ...). Parameters are bound
 * via Prisma's tagged template, never string-concatenated. */
async function adjustVariantAllocated(tx: Tx, variantId: string, delta: number, message: string) {
  const rows = await tx.$queryRaw<{ supplierProductId: string }[]>`
    UPDATE "SupplierProductVariant"
    SET "allocated" = GREATEST(0, "allocated" + ${delta}), "updatedAt" = NOW()
    WHERE "id" = ${variantId}
    RETURNING "supplierProductId"`;
  if (rows.length === 0) return;
  await tx.inventoryActivity.create({
    data: { supplierProductId: rows[0].supplierProductId, variantId, type: 'order_allocation', message, actorId: ACTOR.id, actorName: ACTOR.name },
  });
}

/** Moves a hub variant's physical stock by `delta` and logs it. Orders carry no location, so stock
 * leaving comes out of the fullest location first (never below 0), and stock coming back goes to the
 * variant's first location — see lib/inventory-stock.server.ts. Both row-lock the variant, so
 * concurrent webhook deliveries touching it serialise. */
async function adjustVariantStock(tx: Tx, variantId: string, delta: number, message: string) {
  const found = delta < 0 ? await takeStock(tx, variantId, -delta) : (await addStock(tx, variantId, null, delta)) !== null;
  if (!found) return;
  const { supplierProductId } = await tx.supplierProductVariant.findUniqueOrThrow({ where: { id: variantId }, select: { supplierProductId: true } });
  await tx.inventoryActivity.create({
    data: { supplierProductId, variantId, type: 'order_stock', message, actorId: ACTOR.id, actorName: ACTOR.name },
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

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * Allocates stock for a freshly created (or re-synced) order — one InventoryAllocation row per
 * line item, `allocated += quantity` on the matched hub variant. Idempotent per line: a line
 * that already has a ledger row is left untouched, so re-running this for an order whose lines
 * haven't changed (e.g. orders/updated with no line changes) allocates nothing twice. Lines
 * missing from the ledger — new lines added by an order edit — are allocated on this same call,
 * which is what makes this safe to call from both orders/create and orders/updated.
 *
 * Hub is the source of truth for internal fulfilment; this never writes to Shopify
 * inventory. `Available` stays derived (`max(0, stockOnHand - allocated)`).
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

/**
 * Reconciles the ledger against the current order line set — used for orders/updated
 * (order edits). New lines allocate, removed lines release their outstanding commitment,
 * quantity increases allocate the delta and decreases release the shrunk outstanding
 * portion. SKU changes move the outstanding commitment to the new variant. Physical
 * `stockOnHand` is never touched here: edits only move the `allocated` commitment.
 */
export async function reconcileForOrder(args: {
  storeId: string;
  localOrderId: string | null;
  shopifyOrderId: string;
  orderNumber: number | null;
  lineItems: OrderLineItemInput[];
}) {
  const { storeId, localOrderId, shopifyOrderId, orderNumber, lineItems } = args;

  const incoming = new Map<string, { sku: string | null; quantity: number }>();
  for (const item of lineItems) {
    const quantity = Math.max(0, Math.floor(Number(item.quantity ?? 0)));
    if (quantity === 0) continue;
    incoming.set(String(item.id), { sku: item.sku?.trim() || null, quantity });
  }

  // Upsert incoming lines.
  for (const [lineItemId, next] of incoming) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.inventoryAllocation.findUnique({
        where: { storeId_shopifyOrderId_lineItemId: { storeId, shopifyOrderId, lineItemId } },
      });
      if (!row) {
        const variantId = await findVariantBySku(tx, next.sku);
        await tx.inventoryAllocation.create({
          data: {
            storeId,
            orderId: localOrderId,
            shopifyOrderId,
            orderNumber,
            lineItemId,
            sku: next.sku,
            variantId,
            quantity: next.quantity,
            state: 'ALLOCATED',
          },
        });
        if (variantId) {
          await adjustVariantAllocated(tx, variantId, next.quantity, `Allocated ${next.quantity} for order #${orderNumber ?? shopifyOrderId} (edit)`);
        }
        return;
      }

      // SKU changed — move the outstanding commitment to the new variant.
      if ((row.sku ?? null) !== next.sku) {
        const outstanding = Math.max(0, row.quantity - row.fulfilledQuantity - row.releasedQuantity);
        const nextVariantId = await findVariantBySku(tx, next.sku);
        await tx.inventoryAllocation.update({
          where: { id: row.id },
          data: { sku: next.sku, variantId: nextVariantId, quantity: next.quantity },
        });
        if (outstanding > 0) {
          if (row.variantId) {
            await adjustVariantAllocated(tx, row.variantId, -outstanding, `Released ${outstanding} — order #${row.orderNumber ?? row.shopifyOrderId} edited (SKU changed)`);
          }
          if (nextVariantId) {
            await adjustVariantAllocated(tx, nextVariantId, Math.min(outstanding, next.quantity), `Allocated order #${orderNumber ?? shopifyOrderId} edited (SKU changed)`);
          }
        }
        return;
      }

      const delta = next.quantity - row.quantity;
      if (delta === 0) return;
      if (delta > 0) {
        await tx.inventoryAllocation.update({ where: { id: row.id }, data: { quantity: next.quantity, state: 'ALLOCATED' } });
        if (row.variantId) {
          await adjustVariantAllocated(tx, row.variantId, delta, `Allocated ${delta} more for order #${orderNumber ?? shopifyOrderId} (edit)`);
        }
        return;
      }
      // Quantity shrunk — release the removed outstanding portion only; fulfilled units stay.
      const shrink = -delta;
      const outstanding = Math.max(0, row.quantity - row.fulfilledQuantity - row.releasedQuantity);
      const releasable = Math.min(shrink, outstanding);
      await tx.inventoryAllocation.update({
        where: { id: row.id },
        data: {
          quantity: next.quantity,
          releasedQuantity: row.releasedQuantity + releasable,
          state: next.quantity - row.fulfilledQuantity - (row.releasedQuantity + releasable) <= 0 ? 'RELEASED' : row.state,
        },
      });
      if (row.variantId && releasable > 0) {
        await adjustVariantAllocated(tx, row.variantId, -releasable, `Released ${releasable} — order #${row.orderNumber ?? row.shopifyOrderId} edited (qty reduced)`);
      }
    });
  }

  // Release ledger rows whose line disappeared from the order.
  const rows = await prisma.inventoryAllocation.findMany({ where: { storeId, shopifyOrderId } });
  for (const row of rows) {
    if (incoming.has(row.lineItemId)) continue;
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.inventoryAllocation.findUnique({ where: { id: row.id } });
      if (!fresh || fresh.state === 'RELEASED') return;
      const outstanding = Math.max(0, fresh.quantity - fresh.fulfilledQuantity - fresh.releasedQuantity);
      await tx.inventoryAllocation.update({
        where: { id: fresh.id },
        data: { state: 'RELEASED', releasedQuantity: fresh.quantity - fresh.fulfilledQuantity },
      });
      if (fresh.variantId && outstanding > 0) {
        await adjustVariantAllocated(tx, fresh.variantId, -outstanding, `Released ${outstanding} — order #${fresh.orderNumber ?? fresh.shopifyOrderId} edited (line removed)`);
      }
    });
  }
}

/** Releases every still-outstanding (not yet fulfilled or released) unit on an order — used for
 * orders/cancelled. Rows already FULFILLED are untouched: cancelling an order after it shipped
 * doesn't put stock back, a refund/return does (see applyRefund). Physical `stockOnHand` is
 * never touched here: a cancelled-before-ship commitment only ever lived in `allocated`. */
export async function releaseForOrder(args: { storeId: string; shopifyOrderId: string }) {
  const rows = await prisma.inventoryAllocation.findMany({ where: { storeId: args.storeId, shopifyOrderId: args.shopifyOrderId, state: 'ALLOCATED' } });

  for (const row of rows) {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.inventoryAllocation.findUnique({ where: { id: row.id } });
      if (!fresh || fresh.state !== 'ALLOCATED') return;
      const outstanding = Math.max(0, fresh.quantity - fresh.fulfilledQuantity - fresh.releasedQuantity);
      await tx.inventoryAllocation.update({
        where: { id: fresh.id },
        data: { state: 'RELEASED', releasedQuantity: fresh.quantity - fresh.fulfilledQuantity },
      });
      if (fresh.variantId && outstanding > 0) {
        await adjustVariantAllocated(tx, fresh.variantId, -outstanding, `Released ${outstanding} — order #${fresh.orderNumber ?? fresh.shopifyOrderId} cancelled`);
      }
    });
  }
}

/** Deducts fulfilled quantity from stock and releases the matching allocation — orders/create put
 * the stock in `allocated`, fulfilment now moves it out of both `allocated` and `stockOnHand`.
 * Idempotent per Shopify fulfilment id: the same fulfilment re-delivered via fulfillments/create
 * + fulfillments/update (fresh webhook ids, same `fulfillmentId`) moves stock exactly once.
 * Handles partial fulfilment: only the newly fulfilled units (capped at what's still outstanding
 * on the line) move. */
export async function applyFulfillment(args: { storeId: string; shopifyOrderId: string; fulfillmentId?: string | number | null; lines: FulfillmentLineInput[] }) {
  const fulfillmentKey = args.fulfillmentId == null ? null : String(args.fulfillmentId);

  for (const line of args.lines) {
    const lineItemId = String(line.lineItemId);
    const wanted = Math.max(0, Math.floor(line.quantity));
    if (wanted === 0) continue;

    try {
      await prisma.$transaction(async (tx) => {
        const row = await tx.inventoryAllocation.findUnique({
          where: { storeId_shopifyOrderId_lineItemId: { storeId: args.storeId, shopifyOrderId: args.shopifyOrderId, lineItemId } },
        });
        // No ledger row yet (e.g. fulfilment arrived before the order was
        // allocated) — record nothing so a later re-delivery can still apply.
        if (!row) return;
        if (fulfillmentKey) {
          await tx.processedFulfillmentEvent.create({
            data: { storeId: args.storeId, shopifyOrderId: args.shopifyOrderId, fulfillmentId: fulfillmentKey, lineItemId, status: 'applied', appliedQty: wanted },
          });
        }

        const outstanding = Math.max(0, row.quantity - row.fulfilledQuantity - row.releasedQuantity);
        const qty = Math.min(wanted, outstanding);
        if (qty === 0) return;

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
    } catch (error) {
      // Same fulfilment id already processed (create + update pair, retried delivery).
      if (fulfillmentKey && isUniqueConstraintError(error)) continue;
      throw error;
    }
  }
}

/** Reverses a fulfilment that Shopify itself cancelled (fulfillments/update -> status
 * "cancelled") — puts the units back into stock and back into allocated, since the order line is
 * still open and expected to ship again (Shopify reopens the fulfilment order). Only reverses
 * a fulfilment this ledger previously applied (tracked by fulfilment id); otherwise a no-op. */
export async function reverseFulfillment(args: { storeId: string; shopifyOrderId: string; fulfillmentId?: string | number | null; lines: FulfillmentLineInput[] }) {
  const fulfillmentKey = args.fulfillmentId == null ? null : String(args.fulfillmentId);

  for (const line of args.lines) {
    const lineItemId = String(line.lineItemId);
    const wanted = Math.max(0, Math.floor(line.quantity));
    if (wanted === 0) continue;

    await prisma.$transaction(async (tx) => {
      if (fulfillmentKey) {
        const prior = await tx.processedFulfillmentEvent.findUnique({
          where: { storeId_fulfillmentId_lineItemId: { storeId: args.storeId, fulfillmentId: fulfillmentKey, lineItemId } },
        });
        if (prior?.status === 'reversed') return;
        if (prior) {
          await tx.processedFulfillmentEvent.update({ where: { id: prior.id }, data: { status: 'reversed' } });
        }
        // No prior row (fulfilment applied before per-line idempotency existed):
        // still fall through — the fulfilledQuantity cap below makes duplicates
        // and never-fulfilled lines safe no-ops on its own.
      }
      const row = await tx.inventoryAllocation.findUnique({
        where: { storeId_shopifyOrderId_lineItemId: { storeId: args.storeId, shopifyOrderId: args.shopifyOrderId, lineItemId } },
      });
      if (!row) return;

      const qty = Math.min(wanted, Math.max(0, row.fulfilledQuantity));
      if (qty === 0) return;

      const nextFulfilled = row.fulfilledQuantity - qty;
      await tx.inventoryAllocation.update({ where: { id: row.id }, data: { fulfilledQuantity: nextFulfilled, state: 'ALLOCATED' } });
      if (row.variantId) {
        await adjustVariantAllocated(tx, row.variantId, qty, `Fulfilment cancelled — ${qty} re-allocated for order #${row.orderNumber ?? row.shopifyOrderId}`);
        await adjustVariantStock(tx, row.variantId, qty, `Fulfilment cancelled — ${qty} restored for order #${row.orderNumber ?? row.shopifyOrderId}`);
      }
    });
  }
}

/** Restocks refunded units — refunds/create, following Shopify's `restock_type` semantics:
 * - `CANCEL` (unfulfilled): releases the still-outstanding commitment from `allocated`
 *   only. Physical `stockOnHand` never moved for these units, so it is left untouched.
 * - `RETURN` / `LEGACY_RESTOCK` (fulfilled): puts goods back into `stockOnHand`, capped at
 *   `fulfilled - alreadyRefunded` so a duplicate or overlapping refund can't inflate stock.
 * - `NO_RESTOCK`: financial refund only — releases outstanding commitment, never touches stock.
 * Idempotent per `(refundId, lineItemId)`: the same refund re-delivered, or an
 * orders/cancelled + refunds/create pair for the same units, moves each unit once. */
export async function applyRefund(args: {
  storeId: string;
  shopifyOrderId: string;
  refundId?: string | number | null;
  restock?: boolean | null;
  lines: RefundLineInput[];
}) {
  const refundKey = args.refundId == null ? null : String(args.refundId);

  for (const line of args.lines) {
    const kind = normalizeRestockType(line.restockType, args.restock);
    const lineItemId = String(line.lineItemId);
    const qty = Math.max(0, Math.floor(line.quantity));
    if (qty === 0) continue;

    try {
      await prisma.$transaction(async (tx) => {
        const row = await tx.inventoryAllocation.findUnique({
          where: { storeId_shopifyOrderId_lineItemId: { storeId: args.storeId, shopifyOrderId: args.shopifyOrderId, lineItemId } },
        });
        // No ledger row (or unmapped SKU) — record nothing so a later
        // re-delivery after allocation/backfill can still apply.
        if (!row?.variantId) return;
        if (refundKey) {
          await tx.processedRefundEvent.create({
            data: { storeId: args.storeId, shopifyOrderId: args.shopifyOrderId, refundId: refundKey, lineItemId, quantity: qty, restockType: kind },
          });
        }

        if (kind === 'NO_RESTOCK') {
          const outstanding = Math.max(0, row.quantity - row.fulfilledQuantity - row.releasedQuantity);
          const releasable = Math.min(qty, outstanding);
          if (releasable <= 0) return;
          await tx.inventoryAllocation.update({ where: { id: row.id }, data: { releasedQuantity: row.releasedQuantity + releasable } });
          await adjustVariantAllocated(tx, row.variantId, -releasable, `Refunded ${releasable} released (no restock) — order #${row.orderNumber ?? row.shopifyOrderId}`);
          return;
        }

        if (kind === 'CANCEL') {
          // Unfulfilled units never left physical stock — release commitment only.
          const outstanding = Math.max(0, row.quantity - row.fulfilledQuantity - row.releasedQuantity);
          const releasable = Math.min(qty, outstanding);
          if (releasable <= 0) return;
          await tx.inventoryAllocation.update({ where: { id: row.id }, data: { releasedQuantity: row.releasedQuantity + releasable } });
          await adjustVariantAllocated(tx, row.variantId, -releasable, `Refunded ${releasable} released (cancel) — order #${row.orderNumber ?? row.shopifyOrderId}`);
          return;
        }

        // RETURN / LEGACY — fulfilled goods coming back: restock physical stock only,
        // capped so duplicates can't inflate it. Any still-outstanding portion covered
        // by the same refund line is also released from `allocated` (partial edge).
        const refundable = Math.max(0, Math.min(qty, row.fulfilledQuantity - row.refundedQuantity));
        const outstanding = Math.max(0, row.quantity - row.fulfilledQuantity - row.releasedQuantity);
        const releasable = Math.min(Math.max(0, qty - refundable), outstanding);
        if (refundable <= 0 && releasable <= 0) return;
        if (refundable > 0) {
          await tx.inventoryAllocation.update({ where: { id: row.id }, data: { refundedQuantity: row.refundedQuantity + refundable } });
          await adjustVariantStock(tx, row.variantId, refundable, `Refunded ${refundable} restocked (return) — order #${row.orderNumber ?? row.shopifyOrderId}`);
        }
        if (releasable > 0) {
          await tx.inventoryAllocation.update({ where: { id: row.id }, data: { releasedQuantity: row.releasedQuantity + releasable } });
          await adjustVariantAllocated(tx, row.variantId, -releasable, `Refunded ${releasable} released — order #${row.orderNumber ?? row.shopifyOrderId}`);
        }
      });
    } catch (error) {
      // Same (refund, line) already processed — Shopify retry or duplicate delivery.
      if (refundKey && isUniqueConstraintError(error)) continue;
      throw error;
    }
  }
}
