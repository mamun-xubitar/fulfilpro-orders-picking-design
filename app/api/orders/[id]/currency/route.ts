import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { OrderController } from '@/controllers/order.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { getUserAllowedStoreIds, assertOrderStoreAccess } from '@/lib/store-access.server';

const controller = new OrderController();

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (session?.user?.role !== 'admin') return apiError({ message: 'Forbidden', status: 403 });

  const { id } = await params;

  try {
    const allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
    if (allowedStoreIds !== null) {
      await assertOrderStoreAccess(id, allowedStoreIds);
    }

    const result = await controller.getPresentmentCurrency(id);
    return apiSuccess({ message: 'Currency retrieved', data: result });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to fetch currency',
      status: error instanceof Error && error.message === 'Access denied' ? 403 : 400,
    });
  }
}
