import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { PickingListController } from '@/controllers/picking-list.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { getUserAllowedStoreIds, assertOrderStoreAccess } from '@/lib/store-access.server';

const controller = new PickingListController();

export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== 'admin' && session?.user?.role !== 'order_picker') {
    return apiError({ message: 'Forbidden', status: 403 });
  }
  const body = await request.json() as unknown;

  try {
    if (session?.user?.id && session?.user?.role && Array.isArray((body as { orders?: unknown } | null)?.orders)) {
      const allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
      if (allowedStoreIds !== null) {
        const orders = (body as { orders: Array<{ orderId?: string }> }).orders;
        for (const order of orders) {
          if (order.orderId) {
            await assertOrderStoreAccess(order.orderId, allowedStoreIds);
          }
        }
      }
    }

    const result = await controller.recordPrints(body, session?.user ?? null);
    return apiSuccess({ message: result.message, data: result.data, status: 201 });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to record picking slip print',
      status: error instanceof Error && error.message === 'Access denied' ? 403 : 400,
    });
  }
}
