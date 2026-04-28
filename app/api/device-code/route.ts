import { apiError, apiSuccess } from '@/lib/api-response.server';
import { getDeviceCode } from '@/lib/shopify-partner.server';

export async function GET() {
  try {
    const data = await getDeviceCode();
    return apiSuccess({ message: 'Device code retrieved.', data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to retrieve device code',
      status: 500,
    });
  }
}
