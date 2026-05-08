import { OrderController } from '@/controllers/order.controller.server';
import { apiSuccess } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new OrderController();

export async function GET(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const result = await controller.list(searchParams, session?.user?.id);
  return apiSuccess({ message: 'Orders retrieved', data: result.data });
}
