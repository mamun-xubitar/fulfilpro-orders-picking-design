import { OrderController } from '@/controllers/order.controller.server';
import { apiSuccess } from '@/lib/api-response.server';

const controller = new OrderController();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = await controller.list(searchParams);
  return apiSuccess({ message: 'Orders retrieved', data: result.data });
}
