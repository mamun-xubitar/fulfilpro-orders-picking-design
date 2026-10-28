import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { InvoiceController } from '@/controllers/invoice.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new InvoiceController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await auth();
  const { id } = await params;
  const result = await controller.get(id, session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: 'Invoice retrieved', data: result.data });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await controller.update(id, body, session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await auth();
  const { id } = await params;
  const result = await controller.delete(id, session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data });
}
