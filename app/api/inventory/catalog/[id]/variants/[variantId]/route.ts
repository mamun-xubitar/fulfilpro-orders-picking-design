import { NextRequest } from 'next/server';
import { SupplierProductController } from '@/controllers/supplier-product.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new SupplierProductController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; variantId: string }> }) {
  const session = await auth();
  const { id, variantId } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await controller.updateVariant(id, variantId, body, session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; variantId: string }> }) {
  const session = await auth();
  const { id, variantId } = await params;
  const result = await controller.deleteVariant(id, variantId, session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data });
}
