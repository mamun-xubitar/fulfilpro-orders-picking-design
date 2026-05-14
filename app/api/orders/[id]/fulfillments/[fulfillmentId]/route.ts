import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { FulfillmentRequestController } from '@/controllers/fulfillment-request.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { getUserAllowedStoreIds, assertOrderStoreAccess } from '@/lib/store-access.server';

const controller = new FulfillmentRequestController();

type RouteParams = { params: Promise<{ id: string; fulfillmentId: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) return apiError({ message: 'Unauthorized', status: 401 });

  const { id: orderId, fulfillmentId } = await params;
  const body = await request.json() as unknown;
  const role = session.user.role as string;
  const userId = session.user.id;

  try {
    if (session?.user?.id && session?.user?.role) {
      const allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
      if (allowedStoreIds !== null) {
        await assertOrderStoreAccess(orderId, allowedStoreIds);
      }
    }

    const result = await controller.editFulfillment(orderId, fulfillmentId, body, role, userId);
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({ message: error instanceof Error ? error.message : 'Failed to edit fulfillment', status: error instanceof Error && error.message === 'Access denied' ? 403 : 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) return apiError({ message: 'Unauthorized', status: 401 });

  const { id: orderId, fulfillmentId } = await params;
  const role = session.user.role as string;
  const userId = session.user.id;

  try {
    if (session?.user?.id && session?.user?.role) {
      const allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
      if (allowedStoreIds !== null) {
        await assertOrderStoreAccess(orderId, allowedStoreIds);
      }
    }

    const result = await controller.cancelFulfillment(orderId, fulfillmentId, role, userId, request.nextUrl.origin);
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({ message: error instanceof Error ? error.message : 'Failed to cancel fulfillment', status: error instanceof Error && error.message === 'Access denied' ? 403 : 400 });
  }
}
