import { NextRequest } from 'next/server';
import { SupplierProductController } from '@/controllers/supplier-product.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new SupplierProductController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function GET(request: NextRequest) {
  const session = await auth();
  const result = await controller.checkItemNo(request.nextUrl.searchParams, session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: 'Item number checked', data: result.data });
}
