import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { OrderController } from '@/controllers/order.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { getUserAllowedStoreIds, assertOrderStoreAccess } from '@/lib/store-access.server';
import { ShopifyOrderEditScopeError } from '@/lib/shopify-order-edit.server';

const controller = new OrderController();

type RouteParams = { params: Promise<{ id: string; lineItemId: string }> };

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (session?.user?.role !== 'admin') return apiError({ message: 'Forbidden', status: 403 });

  const { id, lineItemId } = await params;

  try {
    const allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
    if (allowedStoreIds !== null) {
      await assertOrderStoreAccess(id, allowedStoreIds);
    }

    const result = await controller.deleteLineItem(id, lineItemId, await request.json(), {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    });
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to remove line item',
      status: resolveErrorStatus(error),
    });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (session?.user?.role !== 'admin') return apiError({ message: 'Forbidden', status: 403 });

  const { id, lineItemId } = await params;

  try {
    const allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
    if (allowedStoreIds !== null) {
      await assertOrderStoreAccess(id, allowedStoreIds);
    }

    const result = await controller.updateLineItem(id, lineItemId, await request.json(), {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    });
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to update line item',
      status: resolveErrorStatus(error),
    });
  }
}

function resolveErrorStatus(error: unknown) {
  if (error instanceof ShopifyOrderEditScopeError) return 409;
  if (error instanceof Error && error.message === 'Access denied') return 403;
  return 400;
}
