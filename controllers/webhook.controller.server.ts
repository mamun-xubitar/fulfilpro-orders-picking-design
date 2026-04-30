import { OrderModel, type ShopifyOrderPayload } from '@/models/order.model.server';
import { fetchShopifyOrderById } from '@/lib/shopify-order-fetch.server';

const orderModel = new OrderModel();

export class WebhookController {
  async handleOrderCreate(params: {
    topic: string;
    payload: ShopifyOrderPayload;
    storeId: string;
    storeDomain: string;
  }) {
    const { payload, storeId, storeDomain } = params;

    const result = await orderModel.createIfMissingFromOrderCreateWebhook({
      payload,
      storeId,
      storeDomain,
    });

    if (result.created) {
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
    if (result.created) {
      return { data: { created: true, updated: false }, message: 'Updated order created' };
    }

    return { data: { created: false, updated: true }, message: 'Order updated' };
  }
}
