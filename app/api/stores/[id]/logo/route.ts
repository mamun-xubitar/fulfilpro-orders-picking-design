import { NextRequest } from 'next/server';
import { StoreController } from '@/controllers/store.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';

const controller = new StoreController();

type ErrResult = { error: { message: string; status: number } };

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formData = await request.formData();
  const result = await controller.uploadLogo(id, formData);

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
  const result = await controller.deleteLogo(id);

  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, status: error.status });
  }

  return apiSuccess({ message: result.message!, data: result.data });
}
