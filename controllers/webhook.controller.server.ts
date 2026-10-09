import { OrderModel, type ShopifyOrderPayload } from '@/models/order.model.server';
import { fetchShopifyOrderById } from '@/lib/shopify-order-fetch.server';
import { enqueueJob, extractTrackingNumbers } from '@/lib/background-jobs.server';
import { linkOrderLineItems } from '@/lib/product-order-link.server';
import { syncSingleProduct, softDeleteProduct } from '@/lib/shopify-product-sync.server';
import { allocateForOrder, reconcileForOrder, releaseForOrder, applyFulfillment, reverseFulfillment, applyRefund, type RefundLineInput } from '@/lib/inventory-allocation.server';
import prisma from '@/lib/prisma.server';
import { shopifyLocationKey } from '@/lib/shopify-locations.server';
import { StoreLocationModel } from '@/models/store-location.model.server';

const orderModel = new OrderModel();
const storeLocationModel = new StoreLocationModel();

/** Shopify's REST fulfillment webhook payload — fulfillments/create and fulfillments/update. */
export type ShopifyFulfillmentPayload = {
  id?: string | number | null;
  order_id: string | number;
  status?: string | null;
  /** The store location the fulfilment shipped from. */
  location_id?: string | number | null;
  line_items?: Array<{ id: string | number; quantity?: number | null }>;
};

/** Shopify's REST refund webhook payload — refunds/create. */
export type ShopifyRefundPayload = {
  id?: string | number | null;
  order_id: string | number;
  restock?: boolean | null;
  /** `location_id` is the store location a restocked line went back to (null when not restocked). */
  refund_line_items?: Array<{ line_item_id: string | number; quantity?: number | null; restock_type?: string | null; location_id?: string | number | null }>;
};

export class WebhookController {
  async handleOrderCreate(params: {
    topic: string;
    payload: ShopifyOrderPayload;
    storeId: string;
    storeDomain: string;
    accessToken?: string | null;
  }) {
    const { payload, storeId, storeDomain, accessToken } = params;
    const order = payload.id && accessToken
      ? await fetchShopifyOrderById({
          shop: storeDomain,
          accessToken,
          orderId: payload.id,
        })
      : payload;

    const result = await orderModel.createIfMissingFromOrderCreateWebhook({
      payload: order,
      storeId,
      storeDomain,
    });

    if (result.created) {
      await maybeEnqueueTrackingRegistration(storeId, order);
      await maybeLinkOrderLineItems(result.id);
      // Out-of-order guard: Shopify can deliver orders/cancelled before
      // orders/create. A payload that is already cancelled must never allocate.
      if (!result.cancelled) {
        await allocateOrderFromPayload(storeId, result.id, order);
      } else {
        await orderModel.markCancelledFromWebhook({ payload: order, storeId });
      }
      return { data: { created: true }, message: 'Order created' };
    }

    // Already existed — a Shopify retry of a failed delivery, or the order-sync
    // worker won the race. Allocation is idempotent per line, so re-running it
    // here is what lets a failed first attempt converge on retry.
    if (!result.cancelled) {
      await allocateOrderFromPayload(storeId, result.id, order);
    }
    return { data: { created: false }, message: 'Order already exists' };
  }

  async handleOrderUpdated(params: {
    topic: string;
    payload: ShopifyOrderPayload;
    storeId: string;
    storeDomain: string;
    accessToken: string;
    storeCreatedAt: Date;
  }) {
    const { payload, storeId, storeDomain, accessToken, storeCreatedAt } = params;
    if (!payload.id) {
      throw new Error('Order update webhook payload is missing order id');
    }

    const order = await fetchShopifyOrderById({
      shop: storeDomain,
      accessToken,
      orderId: payload.id,
    });

    const result = await orderModel.upsertFromShopifyOrder({
      payload: order,
      storeId,
    });

    await maybeEnqueueTrackingRegistration(storeId, order);
    await maybeLinkOrderLineItems(result.id);
    // Reconciles the ledger against the current line set: new lines allocate,
    // removed lines release, quantity deltas adjust the commitment. A payload
    // that is already cancelled releases instead of allocating. Orders older
    // than the store's connection predate the ledger — reconciling them would
    // allocate lines that already shipped and strand the commitment forever.
    if (!isBeforeConnection(order, storeCreatedAt)) {
      await reconcileOrderFromPayload(storeId, result.id, order);
    }

    if (result.created) {
      return { data: { created: true, updated: false }, message: 'Updated order created' };
    }

    return { data: { created: false, updated: true }, message: 'Order updated' };
  }

  async handleOrderCancelled(params: { payload: ShopifyOrderPayload; storeId: string }) {
    const { payload, storeId } = params;
    if (!payload.id) throw new Error('Order cancelled webhook payload is missing order id');
    await releaseForOrder({ storeId, shopifyOrderId: String(payload.id) });
    // Keep the Order table + OrderLineItem net quantities in sync so the UI and
    // the allocatedFromOrders hint stop counting this order's lines.
    await orderModel.markCancelledFromWebhook({ payload, storeId });
    return { data: { released: true }, message: 'Allocation released' };
  }

  async handleFulfillmentCreate(params: { payload: ShopifyFulfillmentPayload; storeId: string; storeCreatedAt: Date }) {
    const { payload, storeId, storeCreatedAt } = params;
    const lines = (payload.line_items ?? [])
      .filter((li) => Number(li.quantity ?? 0) > 0)
      .map((li) => ({ lineItemId: li.id, quantity: Number(li.quantity) }));
    if (lines.length > 0) {
      const locationId = await resolveHubLocationId(storeId, payload.location_id);
      await applyFulfillment({ storeId, shopifyOrderId: String(payload.order_id), fulfillmentId: payload.id ?? null, locationId, storeCreatedAt, lines });
    }
    return { data: { applied: lines.length }, message: 'Fulfillment applied' };
  }

  async handleFulfillmentUpdate(params: { payload: ShopifyFulfillmentPayload; storeId: string; storeCreatedAt: Date }) {
    const { payload, storeId, storeCreatedAt } = params;
    const status = (payload.status ?? '').toLowerCase();
    const lines = (payload.line_items ?? [])
      .filter((li) => Number(li.quantity ?? 0) > 0)
      .map((li) => ({ lineItemId: li.id, quantity: Number(li.quantity) }));
    if (lines.length === 0) return { data: { applied: 0 }, message: 'No line items on fulfillment update' };
    const locationId = await resolveHubLocationId(storeId, payload.location_id);

    if (status === 'cancelled' || status === 'canceled') {
      await reverseFulfillment({ storeId, shopifyOrderId: String(payload.order_id), fulfillmentId: payload.id ?? null, locationId, lines });
      return { data: { reversed: lines.length }, message: 'Fulfillment cancellation reversed' };
    }
    // Any other status transition (e.g. open -> success, tracking updates) carries
    // the same fulfilment id — applyFulfillment dedupes per fulfilment id, so
    // re-delivering an already-applied fulfilment is a no-op.
    await applyFulfillment({ storeId, shopifyOrderId: String(payload.order_id), fulfillmentId: payload.id ?? null, locationId, storeCreatedAt, lines });
    return { data: { applied: lines.length }, message: 'Fulfillment applied' };
  }

  async handleRefundCreate(params: { payload: ShopifyRefundPayload; storeId: string }) {
    const { payload, storeId } = params;
    const refundLines = (payload.refund_line_items ?? []).filter((li) => Number(li.quantity ?? 0) > 0);
    const lines: RefundLineInput[] = [];
    for (const li of refundLines) {
      const locationId = await resolveHubLocationId(storeId, li.location_id);
      lines.push({ lineItemId: li.line_item_id, quantity: Number(li.quantity), restockType: li.restock_type ?? null, locationId });
    }
    if (lines.length > 0) {
      await applyRefund({ storeId, shopifyOrderId: String(payload.order_id), refundId: payload.id ?? null, restock: payload.restock ?? null, lines });
    }
    return { data: { applied: lines.length }, message: 'Refund applied' };
  }

  async handleProductCreate(params: {
    storeId: string;
    storeDomain: string;
    accessToken: string;
    shopifyProductId: string | number;
  }) {
    await syncSingleProduct({
      storeId: params.storeId,
      shop: params.storeDomain,
      accessToken: params.accessToken,
      shopifyProductId: params.shopifyProductId,
    });
    return { data: { synced: true }, message: 'Product synced' };
  }

  async handleProductUpdated(params: {
    storeId: string;
    storeDomain: string;
    accessToken: string;
    shopifyProductId: string | number;
  }) {
    await syncSingleProduct({
      storeId: params.storeId,
      shop: params.storeDomain,
      accessToken: params.accessToken,
      shopifyProductId: params.shopifyProductId,
    });
    return { data: { synced: true }, message: 'Product updated' };
  }

  async handleProductDelete(params: { storeId: string; shopifyProductId: string | number }) {
    await softDeleteProduct(params.storeId, params.shopifyProductId);
    return { data: { deleted: true }, message: 'Product deleted' };
  }
}

/** The hub location a Shopify location of this store is mapped to (Inventory › Locations › Store
 * locations). Null — stock falls back to the variant's fullest / first location — when the payload
 * has no location or it is unmapped or never synced. */
async function resolveHubLocationId(storeId: string, rawLocationId: string | number | null | undefined): Promise<string | null> {
  const key = shopifyLocationKey(rawLocationId);
  return key ? storeLocationModel.findMappedLocationId(storeId, key) : null;
}

/** True when the order predates the store's connection — it was never webhook-allocated and sits
 * outside the allocation ledger. */
function isBeforeConnection(order: ShopifyOrderPayload, storeCreatedAt: Date) {
  return new Date(order.created_at) < storeCreatedAt;
}

// Allocation/reconcile failures propagate: the route marks the delivery failed and Shopify
// re-delivers (same webhook id → failed row is reset and re-run). Both are idempotent per
// line, so the retry converges instead of double-counting.
async function allocateOrderFromPayload(storeId: string, localOrderId: string, payload: ShopifyOrderPayload) {
  if (!payload.id || !Array.isArray(payload.line_items)) return;
  await allocateForOrder({
    storeId,
    localOrderId,
    shopifyOrderId: String(payload.id),
    orderNumber: payload.order_number ?? null,
    lineItems: payload.line_items.map((li) => ({ id: li.id, sku: li.sku, quantity: li.quantity, shopifyVariantId: li.variant_id })),
  });
}

async function reconcileOrderFromPayload(storeId: string, localOrderId: string, payload: ShopifyOrderPayload) {
  if (!payload.id || !Array.isArray(payload.line_items)) return;
  // A cancelled payload releases instead of reconciling — cancelling after
  // partial shipment keeps fulfilled units while releasing the rest.
  if (payload.cancelled_at ?? payload.canceled_at) {
    await releaseForOrder({ storeId, shopifyOrderId: String(payload.id) });
    await orderModel.markCancelledFromWebhook({ payload, storeId });
    return;
  }
  await reconcileForOrder({
    storeId,
    localOrderId,
    shopifyOrderId: String(payload.id),
    orderNumber: payload.order_number ?? null,
    lineItems: payload.line_items.map((li) => ({ id: li.id, sku: li.sku, quantity: li.quantity, shopifyVariantId: li.variant_id })),
  });
}

async function maybeLinkOrderLineItems(orderId: string) {
  try {
    await linkOrderLineItems(orderId);
  } catch (error) {
    console.error('Failed to link order line items from webhook', { orderId, error });
  }
}

async function maybeEnqueueTrackingRegistration(
  storeId: string,
  payload: ShopifyOrderPayload,
) {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'default' } });
    // trackingAutoRegisterEnabled is added by migration — cast for pre-migration type safety
    if (!(settings as unknown as Record<string, unknown>)?.trackingAutoRegisterEnabled) return;

    const fulfillmentItems = buildFulfillmentItemsFromPayload(payload);
    const trackingNumbers = extractTrackingNumbers(fulfillmentItems);
    if (trackingNumbers.length === 0) return;

    const orderNumber = payload.order_number;
    const dbOrder = await prisma.order.findUnique({
      where: { storeId_number: { storeId, number: orderNumber } },
      select: { id: true },
    });
    if (!dbOrder) return;

    await enqueueJob('register_tracking', { orderId: dbOrder.id });
  } catch (error) {
    console.error('Failed to enqueue tracking registration', error);
  }
}

function buildFulfillmentItemsFromPayload(payload: ShopifyOrderPayload): unknown {
  const fulfillments = Array.isArray(payload.fulfillments) ? payload.fulfillments : [];
  const confirmations = fulfillments
    .filter((f) => {
      const status = (f.status ?? '').toLowerCase();
      return status !== 'cancelled' && status !== 'canceled';
    })
    .map((f) => ({
      trackingInfo: {
        number: f.tracking_number ?? '',
        company: f.tracking_company ?? '',
        url: f.tracking_url ?? '',
      },
    }));
  return { confirmations };
}
