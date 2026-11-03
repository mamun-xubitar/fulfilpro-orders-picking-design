import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { PickingListController } from '@/controllers/picking-list.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { getUserAllowedStoreIds, assertOrderStoreAccess } from '@/lib/store-access.server';

const controller = new PickingListController();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; confirmationId: string }> }
) {
  const { id, confirmationId } = await params;
  const session = await auth();
  if (session?.user?.role !== 'admin' && session?.user?.role !== 'order_picker') {
    return apiError({ message: 'Forbidden', status: 403 });
  }
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    if (session?.user?.id && session?.user?.role) {
      const allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
      if (allowedStoreIds !== null) {
        await assertOrderStoreAccess(id, allowedStoreIds);
      }
    }

    const result = await controller.cancelPacked(id, confirmationId, body, session?.user ?? null, request.nextUrl.origin);
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to cancel packed confirmation',
      status: error instanceof Error && error.message === 'Access denied' ? 403 : 400,
    });
  }
}
