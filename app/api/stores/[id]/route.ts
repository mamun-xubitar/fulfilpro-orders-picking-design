import { NextRequest } from 'next/server';
import { StoreController } from '@/controllers/store.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';

const controller = new StoreController();

type ErrResult = { error: { message: string; status: number } };

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await controller.getInstallLink(id);

  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, status: error.status });
  }

  return apiSuccess({ message: result.message!, data: result.data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as unknown;
  const result = await controller.update(id, body);

  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, status: error.status });
  }

  return apiSuccess({ message: result.message!, data: result.data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await controller.delete(id);

  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, status: error.status });
  }

  return apiSuccess({ message: result.message!, data: null });
}
