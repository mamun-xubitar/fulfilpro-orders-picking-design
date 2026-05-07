import { apiError, apiSuccess } from '@/lib/api-response.server';
import { enqueueOrderSyncJob, getOrderSyncStatus } from '@/lib/order-sync-jobs.server';

export async function GET() {
  try {
    const result = await getOrderSyncStatus();
    return apiSuccess({
      message: 'Order sync status retrieved',
      data: result,
    });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to load Shopify order sync status',
      status: 500,
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const storeIds = Array.isArray(body.storeIds) ? body.storeIds : undefined;
    const result = await enqueueOrderSyncJob(storeIds);
    return apiSuccess({
      message: result.alreadyRunning ? 'A Shopify order sync is already running' : 'Shopify order sync queued',
      data: result,
      status: result.alreadyRunning ? 409 : 202,
    });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to queue Shopify order sync',
      status: 500,
    });
  }
}
