import { OrderController } from '@/controllers/order.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { auth } from '@/auth';
import { getUserAllowedStoreIds, assertOrderStoreAccess } from '@/lib/store-access.server';

const controller = new OrderController();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await auth();
    if (session?.user?.id && session?.user?.role) {
      const allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
      if (allowedStoreIds !== null) {
        await assertOrderStoreAccess(id, allowedStoreIds);
      }
    }

    const result = await controller.getPackingSlipLabel(id);
    return apiSuccess({ message: 'Packing slip label retrieved', data: result.data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to load packing slip label',
      status: error instanceof Error && error.message === 'Access denied' ? 403 : 404,
    });
  }
}
