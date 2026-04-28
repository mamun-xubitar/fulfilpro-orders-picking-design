import { OrderModel, type ShopifyOrderPayload } from '@/models/order.model.server';

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
}
