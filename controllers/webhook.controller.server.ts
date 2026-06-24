import { OrderModel, type ShopifyOrderPayload } from '@/models/order.model.server';
import { fetchShopifyOrderById } from '@/lib/shopify-order-fetch.server';
import { enqueueJob, extractTrackingNumbers } from '@/lib/background-jobs.server';
import prisma from '@/lib/prisma.server';

const orderModel = new OrderModel();

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

    if (result.created) {
      return { data: { created: true, updated: false }, message: 'Updated order created' };
    }

    return { data: { created: false, updated: true }, message: 'Order updated' };
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

    const orderNumber = `${payload.order_number}`;
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
