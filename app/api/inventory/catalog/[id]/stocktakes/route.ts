import { NextRequest } from 'next/server';
import { StocktakeController } from '@/controllers/stocktake.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new StocktakeController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  const result = await controller.start(id, session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data, status: 201 });
}
