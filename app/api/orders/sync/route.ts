import { apiError, apiSuccess } from '@/lib/api-response.server';
import { syncConnectedStoreOrders } from '@/lib/shopify-order-sync.server';

export async function POST() {
  try {
    const result = await syncConnectedStoreOrders();
    return apiSuccess({
      message: 'Shopify orders synced',
      data: result,
    });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to sync Shopify orders',
      status: 500,
    });
  }
}
