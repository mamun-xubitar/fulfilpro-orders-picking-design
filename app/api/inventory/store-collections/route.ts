import { StoreListingController } from '@/controllers/store-listing.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new StoreListingController();

export async function GET(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('storeId')?.trim() ?? '';
  if (!storeId) return apiError({ message: 'Validation failed', errors: ['storeId: Required'], status: 400 });

  const result = await controller.listCollections(storeId, searchParams, session);
  if ('error' in result) {
    const { error } = result as { error: { message: string; status: number } };
    return apiError({ message: error.message, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data });
}

/** Add flow for Collections — body `{ title }` plus `?storeId=…`, creates it on that store. */
export async function POST(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('storeId')?.trim() ?? '';
  if (!storeId) return apiError({ message: 'Validation failed', errors: ['storeId: Required'], status: 400 });

  const body = await request.json().catch(() => ({}));
  const result = await controller.createCollection(storeId, body, session);
  if ('error' in result) {
    const { error } = result as { error: { message: string; errors?: string[]; status: number } };
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data });
}
