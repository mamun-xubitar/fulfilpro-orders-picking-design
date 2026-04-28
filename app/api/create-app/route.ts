import { apiError, apiSuccess } from '@/lib/api-response.server';
import { createApp } from '@/lib/shopify-partner.server';
import { StoreModel } from '@/models/store.model.server';

const storeModel = new StoreModel();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const store = searchParams.get('store');
  const appManagementToken = searchParams.get('appManagementToken');
  const organizationId = searchParams.get('organizationId');

  if (!store || !appManagementToken || !organizationId) {
    return apiError({
      message: 'store, appManagementToken, and organizationId are required',
      errors: ['store, appManagementToken, and organizationId are required'],
      status: 400,
    });
  }

  try {
    const data = await createApp(appManagementToken, organizationId, store);
    await storeModel.createOrUpdateFromAppCreation({
      storeDomain: store,
      clientId: data.clientId,
      clientSecret: data.secretKey,
    });

    return apiSuccess({
      message: 'Shopify app created successfully.',
      data: { installUrl: data.installUrl, partnerUrl: data.partnerUrl },
    });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to create Shopify app',
      status: 500,
    });
  }
}
