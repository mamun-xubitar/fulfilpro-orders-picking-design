import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { DecorationController } from '@/controllers/decoration.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { isDecoratorRole } from '@/lib/roles';
import { getUserAllowedStoreIds, assertOrderStoreAccess } from '@/lib/store-access.server';

const controller = new DecorationController();

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== 'admin' && !isDecoratorRole(role)) return apiError({ message: 'Forbidden', status: 403 });

  const { id } = await params;

  try {
    if (session?.user?.id && session?.user?.role) {
      const allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
      if (allowedStoreIds !== null) {
        await assertOrderStoreAccess(id, allowedStoreIds);
      }
    }

    const result = await controller.updateOrderAttachments(id, await request.json());
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to update attachments',
      status: error instanceof Error && error.message === 'Access denied' ? 403 : 400,
    });
  }
}
