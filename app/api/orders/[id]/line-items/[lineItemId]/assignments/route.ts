import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { DecorationController } from '@/controllers/decoration.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { getUserAllowedStoreIds, assertOrderStoreAccess } from '@/lib/store-access.server';

const controller = new DecorationController();

type RouteParams = { params: Promise<{ id: string; lineItemId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (session?.user?.role !== 'admin') return apiError({ message: 'Forbidden', status: 403 });

  const { id, lineItemId } = await params;

  try {
    if (session?.user?.id && session?.user?.role) {
      const allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
      if (allowedStoreIds !== null) {
        await assertOrderStoreAccess(id, allowedStoreIds);
      }
    }

    const result = await controller.assignLineItem(id, lineItemId, await request.json(), {
      id: session.user.id,
      name: session.user.name,
    });
    return apiSuccess({ message: result.message, data: result.data, status: 201 });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to add assignment',
      status: error instanceof Error && error.message === 'Access denied' ? 403 : 400,
    });
  }
}
