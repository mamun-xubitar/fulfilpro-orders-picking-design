import { NextRequest } from 'next/server';
import { SupplierController } from '@/controllers/supplier.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new SupplierController();

export async function GET(request: NextRequest) {
  const session = await auth();
  const storeId = request.nextUrl.searchParams.get('storeId') ?? '';
  const result = await controller.listStoreCollections(storeId, session);
  if ('error' in result) {
    const { error } = result as { error: { message: string; status: number } };
    return apiError({ message: error.message, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data });
}
