import { apiError, apiSuccess } from '@/lib/api-response.server';
import { resolveShopDomain } from '@/lib/shopify-auth.server';
import { StoreModel } from '@/models/store.model.server';

const storeModel = new StoreModel();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const store = searchParams.get('store');

  if (!store) {
    return apiError({
      message: 'store is required',
      errors: ['store is required'],
      status: 400,
    });
  }

  try {
    const normalizedDomain = await resolveShopDomain(store);
    const existingStore = await storeModel.findByDomain(normalizedDomain);

    const data = {
      connected: existingStore?.status === 'connected',
      name: existingStore?.name ?? null,
      url: existingStore?.url ?? null,
      storeDomain: normalizedDomain,
    };

    return apiSuccess({ message: 'Store status retrieved.', data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Invalid Shopify store domain',
      status: 400,
    });
  }
}
