import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { DecorationController } from '@/controllers/decoration.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { getUserAllowedStoreIds, assertOrderStoreAccess } from '@/lib/store-access.server';

const controller = new DecorationController();

type RouteParams = { params: Promise<{ id: string; lineItemId: string; assignmentId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (session?.user?.role !== 'admin') return apiError({ message: 'Forbidden', status: 403 });

  const { id, lineItemId, assignmentId } = await params;

  try {
    if (session?.user?.id && session?.user?.role) {
      const allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
      if (allowedStoreIds !== null) {
        await assertOrderStoreAccess(id, allowedStoreIds);
      }
    }

    const result = await controller.removeAssignment(id, lineItemId, assignmentId);
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to remove assignment',
      status: error instanceof Error && error.message === 'Access denied' ? 403 : 400,
    });
  }
}
