import { auth } from '@/auth';
import { OrderHubProductController } from '@/controllers/order-hub-product.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { assertOrderStoreAccess, getUserAllowedStoreIds } from '@/lib/store-access.server';

const controller = new OrderHubProductController();

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; lineItemId: string }> }) {
  const { id, lineItemId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError({ message: 'Unauthorized', status: 401 });

  try {
    const allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
    if (allowedStoreIds !== null) await assertOrderStoreAccess(id, allowedStoreIds);

    const result = await controller.ensure(id, lineItemId, session.user);
    if ('error' in result && result.error) return apiError({ message: result.error.message, status: result.error.status });
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to create the product',
      status: error instanceof Error && error.message === 'Access denied' ? 403 : 500,
    });
  }
}
