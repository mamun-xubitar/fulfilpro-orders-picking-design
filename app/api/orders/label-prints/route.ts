import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { OrderController } from '@/controllers/order.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { getUserAllowedStoreIds } from '@/lib/store-access.server';

const controller = new OrderController();

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) return apiError({ message: 'Unauthorized', status: 401 });

  try {
    const body = await request.json().catch(() => null);
    const allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);

    const result = await controller.markLabelsPrinted(body, allowedStoreIds);
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to record label prints',
      status: 400,
    });
  }
}
