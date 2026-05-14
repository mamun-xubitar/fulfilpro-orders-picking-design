import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { OrderController } from '@/controllers/order.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { getUserAllowedStoreIds, assertOrderStoreAccess } from '@/lib/store-access.server';

const controller = new OrderController();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const { id, noteId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError({ message: 'Unauthorized', status: 401 });

  const body = await request.json() as unknown;

  try {
    if (session?.user?.id && session?.user?.role) {
      const allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
      if (allowedStoreIds !== null) {
        await assertOrderStoreAccess(id, allowedStoreIds);
      }
    }

    const result = await controller.updateOrderNote(id, noteId, body, session.user);
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to update note',
      status: error instanceof Error && error.message === 'Access denied' ? 403 : 400,
    });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const { id, noteId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError({ message: 'Unauthorized', status: 401 });

  try {
    if (session?.user?.id && session?.user?.role) {
      const allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
      if (allowedStoreIds !== null) {
        await assertOrderStoreAccess(id, allowedStoreIds);
      }
    }

    const result = await controller.deleteOrderNote(id, noteId);
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to delete note',
      status: error instanceof Error && error.message === 'Access denied' ? 403 : 400,
    });
  }
}
