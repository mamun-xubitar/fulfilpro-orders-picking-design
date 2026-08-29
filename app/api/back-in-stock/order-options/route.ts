import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { BackInStockController } from '@/controllers/back-in-stock.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { getUserAllowedStoreIds } from '@/lib/store-access.server';

const controller = new BackInStockController();

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return apiError({ message: 'Unauthorized', status: 401 });

  try {
    const allowedStoreIds = session.user.role
      ? await getUserAllowedStoreIds(session.user.id, session.user.role)
      : null;
    const result = await controller.searchOrderOptions(request.nextUrl.searchParams, allowedStoreIds);
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({ message: error instanceof Error ? error.message : 'Failed to load orders', status: 400 });
  }
}
