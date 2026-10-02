import { NextRequest } from 'next/server';
import { PoPaymentController } from '@/controllers/po-payment.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new PoPaymentController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };
type Params = { params: Promise<{ id: string }> };

function respond(result: { error: ErrResult['error'] } | { message?: string; data: unknown }) {
  if ('error' in result) return apiError({ message: result.error.message, errors: result.error.errors, status: result.error.status });
  return apiSuccess({ message: result.message ?? 'Payment retrieved', data: result.data });
}

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await auth();
  const { id } = await params;
  return respond(await controller.get(id, session));
}

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await auth();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  return respond(await controller.save(id, body, session));
}
