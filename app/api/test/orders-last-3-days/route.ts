import { apiError, apiSuccess } from '@/lib/api-response.server';
import prisma from '@/lib/prisma.server';
import { normalizeShopDomain } from '@/lib/shopify-auth.server';

type ShopifyOrder = {
  id: number;
  name: string;
  order_number: number;
  created_at: string;
  updated_at: string;
  total_price: string;
  currency: string;
  fulfillment_status: string | null;
  financial_status: string | null;
};

type StoreFetchResult = {
  storeId: string;
  storeDomain: string;
  count: number;
  orders: ShopifyOrder[];
  error?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeParam = searchParams.get('store');

  const createdAtMin = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const normalizedStoreFilter = storeParam ? safeNormalize(storeParam) : null;

  if (storeParam && !normalizedStoreFilter) {
    return apiError({
      message: 'Invalid store domain in query param "store".',
      status: 400,
    });
  }

  const stores = await prisma.store.findMany({
    where: {
      status: 'connected',
      accessToken: { not: null },
      ...(normalizedStoreFilter ? { storeDomain: normalizedStoreFilter } : {}),
    },
    select: {
      id: true,
      storeDomain: true,
      accessToken: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!stores.length) {
    return apiSuccess({
      message: 'No connected stores found for order fetch.',
      data: {
        createdAtMin,
        totalStores: 0,
        totalOrders: 0,
        results: [] as StoreFetchResult[],
      },
    });
  }

  const results = await Promise.all(
    stores.map(async (store): Promise<StoreFetchResult> => {
      try {
        const url = new URL(`https://${store.storeDomain}/admin/api/2025-01/orders.json`);
        url.searchParams.set('status', 'any');
        url.searchParams.set('limit', '250');
        url.searchParams.set('created_at_min', createdAtMin);
        url.searchParams.set(
          'fields',
          'id,name,order_number,created_at,updated_at,total_price,currency,fulfillment_status,financial_status'
        );

        const response = await fetch(url.toString(), {
          headers: {
            'X-Shopify-Access-Token': store.accessToken!,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(20000),
        });

        if (!response.ok) {
          const errText = await response.text();
          return {
            storeId: store.id,
            storeDomain: store.storeDomain,
            count: 0,
            orders: [],
            error: `Shopify request failed (${response.status}): ${errText}`,
          };
        }

        const data = (await response.json()) as { orders?: ShopifyOrder[] };
        const orders = data.orders ?? [];

        return {
          storeId: store.id,
          storeDomain: store.storeDomain,
          count: orders.length,
          orders,
        };
      } catch (error) {
        return {
          storeId: store.id,
          storeDomain: store.storeDomain,
          count: 0,
          orders: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })
  );

  const totalOrders = results.reduce((sum, item) => sum + item.count, 0);

  return apiSuccess({
    message: 'Fetched orders for last 3 days.',
    data: {
      createdAtMin,
      totalStores: results.length,
      totalOrders,
      results,
    },
  });
}

function safeNormalize(domain: string) {
  try {
    return normalizeShopDomain(domain);
  } catch {
    return null;
  }
}
