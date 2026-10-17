import { NextRequest } from 'next/server';
import { SupplierProductController } from '@/controllers/supplier-product.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new SupplierProductController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  try {
    const session = await auth();
    const { id, imageId } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await controller.moveImage(id, imageId, body, session);
    if ('error' in result) {
      const { error } = result as ErrResult;
      return apiError({ message: error.message, errors: error.errors, status: error.status });
    }
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({ message: error instanceof Error ? error.message : 'Failed to move image', status: 400 });
  }
}
