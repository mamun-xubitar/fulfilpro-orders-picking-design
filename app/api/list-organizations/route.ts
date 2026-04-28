import { apiError, apiSuccess } from '@/lib/api-response.server';
import { listOrganizations } from '@/lib/shopify-partner.server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const businessPlatformToken = searchParams.get('businessPlatformToken');
  const store = searchParams.get('store');

  if (!businessPlatformToken || !store) {
    return apiError({
      message: 'businessPlatformToken and store are required',
      errors: ['businessPlatformToken and store are required'],
      status: 400,
    });
  }

  try {
    const data = await listOrganizations(businessPlatformToken, store);
    return apiSuccess({ message: 'Organizations retrieved.', data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to list organizations',
      status: 500,
    });
  }
}
