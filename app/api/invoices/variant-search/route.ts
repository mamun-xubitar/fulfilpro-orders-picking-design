import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { InvoiceController } from '@/controllers/invoice.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new InvoiceController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function GET(request: NextRequest) {
  const session = await auth();
  const params = request.nextUrl.searchParams;
  const result = await controller.variantSearch(params.get('storeId') ?? '', params.get('q') ?? '', session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: 'Products retrieved', data: result.data });
}
