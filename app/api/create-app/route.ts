import { apiError, apiSuccess } from '@/lib/api-response.server';
import { createApp } from '@/lib/shopify-partner.server';
import { StoreModel } from '@/models/store.model.server';

const storeModel = new StoreModel();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const store = searchParams.get('store');
  const appManagementToken = searchParams.get('appManagementToken');
  const organizationId = searchParams.get('organizationId');
  const partnerStoreId = searchParams.get('partnerStoreId');
  const appManagementTokenExpiresAt = searchParams.get("appManagementTokenExpiresAt");

  if (!store || !appManagementToken || !organizationId || !appManagementTokenExpiresAt) {
    return apiError({
      message: 'store, appManagementToken, appManagementTokenExpiresAt and organizationId are required',
      errors: ['store, appManagementToken, appManagementTokenExpiresAt and organizationId are required'],
      status: 400,
    });
  }

  if (!partnerStoreId) {
    return apiError({
      message: 'Partner store is required to create app',
      status: 400,
    });
  }

  try {
    const partnerStore = await storeModel.findById(partnerStoreId);
    if (!partnerStore) {
      return apiError({
        message: 'Partner store not found',
        status: 404,
      });
    }

    const data = await createApp(appManagementToken, organizationId, store);
    
    await storeModel.createOrUpdateFromAppCreation({
      storeDomain: store,
      appId: data.appId,
      clientId: data.clientId,
      clientSecret: data.secretKey,
      partnerStoreId: partnerStoreId,
      appManagementToken: appManagementToken,
      appManagementTokenExpiresAt: appManagementTokenExpiresAt
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
