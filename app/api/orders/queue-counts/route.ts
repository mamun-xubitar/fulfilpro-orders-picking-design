import { OrderController } from '@/controllers/order.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';
import { getUserAllowedStoreIds } from '@/lib/store-access.server';

const controller = new OrderController();

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) return apiError({ message: 'Unauthorized', status: 401 });
    const { searchParams } = new URL(request.url);
    const allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
    const result = await controller.queueCounts(searchParams, allowedStoreIds, session.user.role);
    return apiSuccess({ message: 'Queue counts retrieved', data: result.data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to load queue counts',
      status: 500,
    });
  }
}
