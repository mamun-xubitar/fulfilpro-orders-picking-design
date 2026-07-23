import { NextRequest } from 'next/server';
import { normalizeShopDomain, verifyWebhookHmac } from '@/lib/shopify-auth.server';
import { StoreModel } from '@/models/store.model.server';
import { WebhookController } from '@/controllers/webhook.controller.server';

const storeModel = new StoreModel();
const webhookController = new WebhookController();

const ALLOWED_TOPICS = new Set([
  'products/create',
  'products/update',
  'products/delete',
]);

export async function POST(request: NextRequest) {
  const topic = request.headers.get('x-shopify-topic')?.toLowerCase() ?? '';
  const hmac = request.headers.get('x-shopify-hmac-sha256') ?? '';
  const shopDomainHeader = request.headers.get('x-shopify-shop-domain') ?? '';
  console.log('Received webhook', { topic, shopDomainHeader });
  if (!topic || !hmac || !shopDomainHeader) {
    return Response.json({ success: false, message: 'Missing webhook headers' }, { status: 400 });
  }

  if (!ALLOWED_TOPICS.has(topic)) {
    return Response.json({ success: true, message: 'Topic ignored' }, { status: 200 });
  }

  let normalizedShop: string;
  try {
    normalizedShop = normalizeShopDomain(shopDomainHeader);
  } catch {
    return Response.json({ success: false, message: 'Invalid shop domain header' }, { status: 400 });
  }

  const store = await storeModel.findByDomain(normalizedShop);
  if (!store) {
    return Response.json({ success: false, message: 'Store not found' }, { status: 404 });
  }

  const rawBody = await request.text();
  const verified = verifyWebhookHmac(rawBody, hmac, store.clientSecret);
  if (!verified) {
    return Response.json({ success: false, message: 'Webhook HMAC verification failed' }, { status: 401 });
  }

  let payload: { id?: string | number };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ success: false, message: 'Invalid webhook JSON payload' }, { status: 400 });
  }

  if (payload.id == null) {
    return Response.json({ success: false, message: 'Webhook payload is missing product id' }, { status: 400 });
  }

  try {
    switch (topic) {
      case 'products/create':
        if (!store.accessToken) throw new Error('Store is missing a Shopify access token');
        await webhookController.handleProductCreate({
          storeId: store.id,
          storeDomain: normalizedShop,
          accessToken: store.accessToken,
          shopifyProductId: payload.id,
        });
        break;
      case 'products/update':
        if (!store.accessToken) throw new Error('Store is missing a Shopify access token');
        await webhookController.handleProductUpdated({
          storeId: store.id,
          storeDomain: normalizedShop,
          accessToken: store.accessToken,
          shopifyProductId: payload.id,
        });
        break;
      case 'products/delete':
        await webhookController.handleProductDelete({
          storeId: store.id,
          shopifyProductId: payload.id,
        });
        break;
      default:
        break;
    }
    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Product webhook processing failed', {
      topic,
      shop: normalizedShop,
      error,
    });
    return Response.json({ success: false, message: 'Webhook processing failed' }, { status: 500 });
  }
}
