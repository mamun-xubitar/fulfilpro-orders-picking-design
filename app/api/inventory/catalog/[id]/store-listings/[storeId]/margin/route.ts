import { NextRequest } from 'next/server';
import { StoreListingController } from '@/controllers/store-listing.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new StoreListingController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; storeId: string }> }) {
  const session = await auth();
  const { id, storeId } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await controller.setMargin(id, storeId, body, session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data });
}
