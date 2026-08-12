import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { OrderController } from '@/controllers/order.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { getUserAllowedStoreIds, assertOrderStoreAccess } from '@/lib/store-access.server';

const controller = new OrderController();

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (session?.user?.role !== 'admin') return apiError({ message: 'Forbidden', status: 403 });

  const { id } = await params;

  try {
    const allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
    if (allowedStoreIds !== null) {
      await assertOrderStoreAccess(id, allowedStoreIds);
    }

    const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';
    const result = await controller.searchStoreVariants(id, query);
    return apiSuccess({ message: 'Variants retrieved', data: result.data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to search variants',
      status: error instanceof Error && error.message === 'Access denied' ? 403 : 400,
    });
  }
}
