import { StoreLocationController } from '@/controllers/store-location.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new StoreLocationController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function GET() {
  const session = await auth();
  const result = await controller.list(session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: 'Store locations retrieved', data: result.data });
}

/** Syncs every connected store's locations from Shopify. */
export async function POST() {
  const session = await auth();
  const result = await controller.sync(session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data });
}
