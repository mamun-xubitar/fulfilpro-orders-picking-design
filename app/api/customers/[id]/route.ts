import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { CustomerController, asSource } from '@/controllers/customer.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new CustomerController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };
type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const session = await auth();
  const { id } = await params;
  const result = await controller.get(id, asSource(request.nextUrl.searchParams.get('source')), session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: 'Customer retrieved', data: result.data });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await controller.update(id, body, asSource(request.nextUrl.searchParams.get('source')), session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await auth();
  const { id } = await params;
  const result = await controller.delete(id, asSource(request.nextUrl.searchParams.get('source')), session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data });
}
