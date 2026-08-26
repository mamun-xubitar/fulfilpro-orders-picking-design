import { NextRequest } from 'next/server';
import { StocktakeController } from '@/controllers/stocktake.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new StocktakeController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ stocktakeId: string }> }) {
  const session = await auth();
  const { stocktakeId } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await controller.complete(stocktakeId, body, session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data });
}
