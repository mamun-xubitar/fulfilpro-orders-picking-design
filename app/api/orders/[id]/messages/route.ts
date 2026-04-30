import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { OrderController } from '@/controllers/order.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new OrderController();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await controller.getOrderMessageCenter(id);
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to load order messages',
      status: 400,
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const body = await request.json() as unknown;

  try {
    const result = await controller.sendAdminOrderMessage(id, body, session?.user ?? null);
    return apiSuccess({ message: result.message, data: result.data, status: 201 });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to send message',
      status: 400,
    });
  }
}
