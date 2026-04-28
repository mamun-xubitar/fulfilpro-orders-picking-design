import { apiError, apiSuccess } from '@/lib/api-response.server';
import { pollForToken } from '@/lib/shopify-partner.server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const deviceCode = searchParams.get('device_code');

  if (!deviceCode) {
    return apiError({
      message: 'device_code is required',
      errors: ['device_code is required'],
      status: 400,
    });
  }

  try {
    const data = await pollForToken(deviceCode);
    return apiSuccess({ message: 'Token polled.', data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to poll token',
      status: 500,
    });
  }
}
