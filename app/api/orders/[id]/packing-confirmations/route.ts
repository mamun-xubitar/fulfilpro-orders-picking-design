import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { PickingListController } from '@/controllers/picking-list.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { getUserAllowedStoreIds, assertOrderStoreAccess } from '@/lib/store-access.server';

const controller = new PickingListController();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (session?.user?.role !== 'admin' && session?.user?.role !== 'order_picker') {
    return apiError({ message: 'Forbidden', status: 403 });
  }
  const body = await request.json() as unknown;

  try {
    if (session?.user?.id && session?.user?.role) {
      const allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
      if (allowedStoreIds !== null) {
        await assertOrderStoreAccess(id, allowedStoreIds);
      }
    }

    const result = await controller.confirmPacked(id, body, session?.user ?? null, request.nextUrl.origin);
    return apiSuccess({ message: result.message, data: result.data, status: 201 });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to confirm packed quantities',
      status: error instanceof Error && error.message === 'Access denied' ? 403 : 400,
    });
  }
}
