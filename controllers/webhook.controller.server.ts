import { OrderModel, type ShopifyOrderPayload } from '@/models/order.model.server';
import { fetchShopifyOrderById } from '@/lib/shopify-order-fetch.server';
import { enqueueJob, extractTrackingNumbers } from '@/lib/background-jobs.server';
import { linkOrderLineItems } from '@/lib/product-order-link.server';
import { syncSingleProduct, softDeleteProduct } from '@/lib/shopify-product-sync.server';
import { allocateForOrder, reconcileForOrder, releaseForOrder, applyFulfillment, reverseFulfillment, applyRefund } from '@/lib/inventory-allocation.server';
import prisma from '@/lib/prisma.server';

const orderModel = new OrderModel();

/** Shopify's REST fulfillment webhook payload — fulfillments/create and fulfillments/update. */
export type ShopifyFulfillmentPayload = {
  id?: string | number | null;
  order_id: string | number;
  status?: string | null;
  line_items?: Array<{ id: string | number; quantity?: number | null }>;
};

/** Shopify's REST refund webhook payload — refunds/create. */
export type ShopifyRefundPayload = {
  id?: string | number | null;
  order_id: string | number;
  restock?: boolean | null;
  refund_line_items?: Array<{ line_item_id: string | number; quantity?: number | null; restock_type?: string | null }>;
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
        await maybeAllocateOrder(storeId, result.id, order);
      } else {
        await orderModel.markCancelledFromWebhook({ payload: order, storeId });
      }
      return { data: { created: true }, message: 'Order created' };
    }

    return { data: { created: false }, message: 'Order already exists' };
  }

  async handleOrderUpdated(params: {
    topic: string;
    payload: ShopifyOrderPayload;
    storeId: string;
    storeDomain: string;
    accessToken: string;
  }) {
    const { payload, storeId, storeDomain, accessToken } = params;
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
    // that is already cancelled releases instead of allocating.
    await maybeReconcileOrder(storeId, result.id, order);

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

  async handleFulfillmentCreate(params: { payload: ShopifyFulfillmentPayload; storeId: string }) {
    const { payload, storeId } = params;
    const lines = (payload.line_items ?? [])
      .filter((li) => Number(li.quantity ?? 0) > 0)
      .map((li) => ({ lineItemId: li.id, quantity: Number(li.quantity) }));
    if (lines.length > 0) {
      await applyFulfillment({ storeId, shopifyOrderId: String(payload.order_id), fulfillmentId: payload.id ?? null, lines });
    }
    return { data: { applied: lines.length }, message: 'Fulfillment applied' };
  }

  async handleFulfillmentUpdate(params: { payload: ShopifyFulfillmentPayload; storeId: string }) {
    const { payload, storeId } = params;
    const status = (payload.status ?? '').toLowerCase();
    const lines = (payload.line_items ?? [])
      .filter((li) => Number(li.quantity ?? 0) > 0)
      .map((li) => ({ lineItemId: li.id, quantity: Number(li.quantity) }));
    if (lines.length === 0) return { data: { applied: 0 }, message: 'No line items on fulfillment update' };

    if (status === 'cancelled' || status === 'canceled') {
      await reverseFulfillment({ storeId, shopifyOrderId: String(payload.order_id), fulfillmentId: payload.id ?? null, lines });
      return { data: { reversed: lines.length }, message: 'Fulfillment cancellation reversed' };
    }
    // Any other status transition (e.g. open -> success, tracking updates) carries
    // the same fulfilment id — applyFulfillment dedupes per fulfilment id, so
    // re-delivering an already-applied fulfilment is a no-op.
    await applyFulfillment({ storeId, shopifyOrderId: String(payload.order_id), fulfillmentId: payload.id ?? null, lines });
    return { data: { applied: lines.length }, message: 'Fulfillment applied' };
  }

  async handleRefundCreate(params: { payload: ShopifyRefundPayload; storeId: string }) {
    const { payload, storeId } = params;
    const lines = (payload.refund_line_items ?? [])
      .filter((li) => Number(li.quantity ?? 0) > 0)
      .map((li) => ({ lineItemId: li.line_item_id, quantity: Number(li.quantity), restockType: li.restock_type ?? null }));
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

async function maybeAllocateOrder(storeId: string, localOrderId: string, payload: ShopifyOrderPayload) {
  try {
    if (!payload.id || !Array.isArray(payload.line_items)) return;
    await allocateForOrder({
      storeId,
      localOrderId,
      shopifyOrderId: String(payload.id),
      orderNumber: payload.order_number ?? null,
      lineItems: payload.line_items.map((li) => ({ id: li.id, sku: li.sku, quantity: li.quantity })),
    });
  } catch (error) {
    console.error('Failed to allocate inventory from order webhook', { orderId: localOrderId, error });
  }
}

async function maybeReconcileOrder(storeId: string, localOrderId: string, payload: ShopifyOrderPayload) {
  try {
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
      lineItems: payload.line_items.map((li) => ({ id: li.id, sku: li.sku, quantity: li.quantity })),
    });
  } catch (error) {
    console.error('Failed to reconcile inventory from order webhook', { orderId: localOrderId, error });
  }
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
