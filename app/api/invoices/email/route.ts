import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { InvoiceController } from '@/controllers/invoice.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new InvoiceController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function POST(request: NextRequest) {
  const session = await auth();
  const body = await request.json().catch(() => ({}));
  const result = await controller.bulkEmail(body, request.nextUrl.origin, session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data });
}
