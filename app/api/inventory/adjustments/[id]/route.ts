import { NextRequest } from 'next/server';
import { StockAdjustmentController } from '@/controllers/stock-adjustment.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new StockAdjustmentController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  const result = await controller.get(id, session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: 'Adjustment fetched', data: result.data });
}
