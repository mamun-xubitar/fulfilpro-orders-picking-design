import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/product.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new ProductController();

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;
  const result = await controller.remove(id, session);

  if ('error' in result) {
    const { error } = result as { error: { message: string; status: number } };
    return apiError({ message: error.message, status: error.status });
  }

  return apiSuccess({ message: result.message ?? 'Product deleted', data: null });
}
