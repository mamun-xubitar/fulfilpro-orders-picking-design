import { WebhookController, type ShopifyFulfillmentPayload, type ShopifyRefundPayload } from '@/controllers/webhook.controller.server';
import prisma from '@/lib/prisma.server';
import { normalizeShopDomain, verifyWebhookHmac } from '@/lib/shopify-auth.server';
import { type ShopifyOrderPayload } from '@/models/order.model.server';
import { StoreModel } from '@/models/store.model.server';
import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';

const storeModel = new StoreModel();
const webhookController = new WebhookController();

const ALLOWED_TOPICS = new Set([
  'orders/create',
  'orders/updated',
  'orders/cancelled',
  'fulfillments/create',
  'fulfillments/update',
  'refunds/create',
]);

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export async function POST(request: NextRequest) {
  const topic = request.headers.get('x-shopify-topic')?.toLowerCase() ?? '';
  const hmac = request.headers.get('x-shopify-hmac-sha256') ?? '';
  const shopDomainHeader = request.headers.get('x-shopify-shop-domain') ?? '';
  const webhookId = request.headers.get('x-shopify-webhook-id') ?? '';
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

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ success: false, message: 'Invalid webhook JSON payload' }, { status: 400 });
  }

  // Idempotency guard — Shopify's own retries of the same delivery carry the same webhook id.
  // A unique-constraint violation here means we've already taken (or are already taking) this
  // exact delivery, so the retry is acknowledged without processing it again — critical for the
  // order-lifecycle topics below, since re-running them would double-move inventory.
  let eventId: string | null = null;
  if (webhookId) {
    try {
      const event = await prisma.shopifyWebhookEvent.create({ data: { storeId: store.id, webhookId, topic, status: 'processing' } });
      eventId = event.id;
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      // Same delivery seen before. 'done'/'processing' rows short-circuit as before,
      // but a 'failed' row means the handler never completed (Shopify retries failed
      // deliveries with the same webhook id) — reset it and run the handler so the
      // inventory movement isn't stranded. Line-level ledgers (InventoryAllocation,
      // ProcessedFulfillmentEvent, ProcessedRefundEvent) still prevent double-counting.
      const existing = await prisma.shopifyWebhookEvent.findUnique({
        where: { storeId_webhookId: { storeId: store.id, webhookId } },
        select: { id: true, status: true },
      });
      if (existing?.status === 'failed') {
        await prisma.shopifyWebhookEvent.update({
          where: { id: existing.id },
          data: { status: 'processing', error: null, processedAt: null },
        });
        eventId = existing.id;
      } else if (existing) {
        return Response.json({ success: true, message: 'Already processed' }, { status: 200 });
      } else {
        // Guard row vanished between the conflict and the lookup — proceed; the
        // line-level ledgers below still keep every movement idempotent.
        eventId = null;
      }
    }
  }

  try {
    switch (topic) {
      case 'orders/create':
        await webhookController.handleOrderCreate({
          topic,
          payload: payload as ShopifyOrderPayload,
          storeId: store.id,
          storeDomain: normalizedShop,
          accessToken: store.accessToken,
        });
        break;
      // case 'orders/updated': {
      //   if (!store.accessToken) {
      //     throw new Error('Store is missing a Shopify access token');
      //   }
      //   await webhookController.handleOrderUpdated({
      //     topic,
      //     payload: payload as ShopifyOrderPayload,
      //     storeId: store.id,
      //     storeDomain: normalizedShop,
      //     accessToken: store.accessToken,
      //   });
      //   break;
      // }
      case 'orders/cancelled':
        await webhookController.handleOrderCancelled({ payload: payload as ShopifyOrderPayload, storeId: store.id });
        break;
      case 'fulfillments/create':
        await webhookController.handleFulfillmentCreate({ payload: payload as ShopifyFulfillmentPayload, storeId: store.id });
        break;
      case 'fulfillments/update':
        await webhookController.handleFulfillmentUpdate({ payload: payload as ShopifyFulfillmentPayload, storeId: store.id });
        break;
      case 'refunds/create':
        await webhookController.handleRefundCreate({ payload: payload as ShopifyRefundPayload, storeId: store.id });
        break;
      default:
        break;
    }
    if (eventId) await prisma.shopifyWebhookEvent.update({ where: { id: eventId }, data: { status: 'done', processedAt: new Date() } });
    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Order webhook processing failed', { topic, shop: normalizedShop, error });
    if (eventId) {
      await prisma.shopifyWebhookEvent
        .update({ where: { id: eventId }, data: { status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' } })
        .catch(() => {});
    }
    return Response.json({ success: false, message: 'Webhook processing failed' }, { status: 500 });
  }
}
