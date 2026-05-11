import { NextRequest } from 'next/server';
import { OrderController } from '@/controllers/order.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new OrderController();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as unknown;

  try {
    const result = await controller.confirmFulfillment(id, body, request.nextUrl.origin);
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to confirm fulfillment',
      status: 400,
    });
  }
}
