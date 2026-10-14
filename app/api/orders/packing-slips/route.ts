import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { OrderController } from '@/controllers/order.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { getUserAllowedStoreIds } from '@/lib/store-access.server';

const controller = new OrderController();

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) return apiError({ message: 'Unauthorized', status: 401 });

  try {
    const ids = (request.nextUrl.searchParams.get('ids') ?? '').split(',').map((id) => id.trim()).filter(Boolean);
    const allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);

    const result = await controller.getPackingSlipLabels(ids, allowedStoreIds);
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to load packing slip labels',
      status: 400,
    });
  }
}
