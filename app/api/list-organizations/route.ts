import { apiError, apiSuccess } from '@/lib/api-response.server';
import { listOrganizations } from '@/lib/shopify-partner.server';
import { StoreModel } from '@/models/store.model.server';

const storeModel = new StoreModel();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const businessPlatformToken = searchParams.get('businessPlatformToken');
  const store = searchParams.get('store');
  const partnerStoreId = searchParams.get('partnerStoreId');

  if (!businessPlatformToken || !store) {
    return apiError({
      message: 'businessPlatformToken and store are required',
      errors: ['businessPlatformToken and store are required'],
      status: 400,
    });
  }

  try {
    let domainToCheck = store;
    
    if (partnerStoreId) {
      const partnerStore = await storeModel.findById(partnerStoreId);
      if (!partnerStore) {
        return apiError({
          message: 'Partner store not found',
          status: 404,
        });
      }
      domainToCheck = partnerStore.storeDomain;
    }

    const data = await listOrganizations(businessPlatformToken, domainToCheck);
    return apiSuccess({ message: 'Organizations retrieved.', data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to list organizations',
      status: 500,
    });
  }
}
