import { OrderController } from '@/controllers/order.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';
import { getUserAllowedStoreIds } from '@/lib/store-access.server';

const controller = new OrderController();

export async function GET(request: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    let allowedStoreIds: string[] | null | undefined;

    if (session?.user?.id && session?.user?.role) {
      allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
    }

    const result = await controller.list(searchParams, session?.user?.id, allowedStoreIds, session?.user?.role);
    return apiSuccess({ message: 'Orders retrieved', data: result.data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to load orders',
      status: 500,
    });
  }
}
