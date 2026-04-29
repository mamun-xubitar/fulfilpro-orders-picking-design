import prisma from '@/lib/prisma.server';
import { OrderModel, type ShopifyOrderPayload } from '@/models/order.model.server';

const SHOPIFY_API_VERSION = '2026-04';
const orderModel = new OrderModel();

type SyncStoreResult = {
  storeId: string;
  storeDomain: string;
  fetched: number;
  created: number;
  updated: number;
  error?: string;
};

export async function syncConnectedStoreOrders() {
  const stores = await prisma.store.findMany({
    where: {
      status: 'connected',
      accessToken: { not: null },
    },
    select: {
      id: true,
      storeDomain: true,
      accessToken: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const results = await Promise.all(
    stores.map(async (store): Promise<SyncStoreResult> => {
      try {
        let fetched = 0;
        let created = 0;
        let updated = 0;

        for await (const order of fetchShopifyOrders(store.storeDomain, store.accessToken!)) {
          fetched += 1;
          const result = await orderModel.upsertFromShopifyOrder({
            payload: order,
            storeId: store.id,
          });
          console.log("my update", order)
          if (result.created) created += 1;
          if (result.updated) updated += 1;
        }

        return {
          storeId: store.id,
          storeDomain: store.storeDomain,
          fetched,
          created,
          updated,
        };
      } catch (error) {
        return {
          storeId: store.id,
          storeDomain: store.storeDomain,
          fetched: 0,
          created: 0,
          updated: 0,
          error: error instanceof Error ? error.message : 'Unknown sync error',
        };
      }
    })
  );

  return {
    totalStores: stores.length,
    totalFetched: results.reduce((sum, item) => sum + item.fetched, 0),
    totalCreated: results.reduce((sum, item) => sum + item.created, 0),
    totalUpdated: results.reduce((sum, item) => sum + item.updated, 0),
    failedStores: results.filter((item) => item.error).length,
    results,
  };
}

async function* fetchShopifyOrders(shop: string, accessToken: string): AsyncGenerator<ShopifyOrderPayload> {
  let nextUrl: string | null = getInitialOrdersUrl(shop);

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify order sync failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as { orders?: ShopifyOrderPayload[] };
    for (const order of data.orders ?? []) {
      yield order;
    }

    nextUrl = getNextPageUrl(response.headers.get('link'));
  }
}

function getInitialOrdersUrl(shop: string) {
  const url = new URL(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/orders.json`);
  url.searchParams.set('status', 'any');
  url.searchParams.set('limit', '250');
  url.searchParams.set('order', 'created_at desc');
  return url.toString();
}

function getNextPageUrl(linkHeader: string | null) {
  if (!linkHeader) return null;

  const nextLink = linkHeader
    .split(',')
    .map((part) => part.trim())
    .find((part) => part.includes('rel="next"'));

  return nextLink?.match(/<([^>]+)>/)?.[1] ?? null;
}
