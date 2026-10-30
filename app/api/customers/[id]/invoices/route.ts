import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { CustomerController } from '@/controllers/customer.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new CustomerController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };
type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const session = await auth();
  const { id } = await params;
  const result = await controller.invoices(id, request.nextUrl.searchParams, session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: 'Invoices retrieved', data: result.data });
}
