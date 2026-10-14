import { NextRequest } from 'next/server';
import { PurchaseRecommendationController } from '@/controllers/purchase-recommendation.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new PurchaseRecommendationController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function GET(request: NextRequest) {
  const session = await auth();
  const result = await controller.list(request.nextUrl.searchParams, session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: 'Purchase recommendations fetched', data: result.data });
}
