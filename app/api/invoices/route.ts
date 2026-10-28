import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { InvoiceController } from '@/controllers/invoice.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new InvoiceController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function GET(request: NextRequest) {
  const session = await auth();
  const result = await controller.list(request.nextUrl.searchParams, session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: 'Invoices retrieved', data: result.data });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const body = await request.json().catch(() => ({}));
  const result = await controller.create(body, session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data, status: 201 });
}
