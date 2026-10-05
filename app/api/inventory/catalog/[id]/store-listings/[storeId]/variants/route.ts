import { NextRequest } from 'next/server';
import { StoreListingEditController } from '@/controllers/store-listing-edit.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new StoreListingEditController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };
type Params = { params: Promise<{ id: string; storeId: string }> };

function respond(result: { error: ErrResult['error'] } | { message: string; data: unknown }, status = 200) {
  if ('error' in result) return apiError({ message: result.error.message, errors: result.error.errors, status: result.error.status });
  return apiSuccess({ message: result.message, data: result.data, status });
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  const { id, storeId } = await params;
  const body = await request.json().catch(() => ({}));
  return respond(await controller.createVariant(id, storeId, body, session), 201);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  const { id, storeId } = await params;
  const body = await request.json().catch(() => ({}));
  return respond(await controller.updateVariants(id, storeId, body, session));
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await auth();
  const { id, storeId } = await params;
  const body = await request.json().catch(() => ({}));
  return respond(await controller.deleteVariants(id, storeId, body, session));
}
