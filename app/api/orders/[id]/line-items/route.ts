import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { OrderController } from '@/controllers/order.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { getUserAllowedStoreIds, assertOrderStoreAccess } from '@/lib/store-access.server';
import { ShopifyOrderEditScopeError } from '@/lib/shopify-order-edit.server';

const controller = new OrderController();

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (session?.user?.role !== 'admin') return apiError({ message: 'Forbidden', status: 403 });

  const { id } = await params;

  try {
    const allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
    if (allowedStoreIds !== null) {
      await assertOrderStoreAccess(id, allowedStoreIds);
    }

    const result = await controller.addLineItem(id, await request.json(), {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    });
    return apiSuccess({ message: result.message, data: result.data, status: 201 });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to add line item',
      status: resolveErrorStatus(error),
    });
  }
}

function resolveErrorStatus(error: unknown) {
  if (error instanceof ShopifyOrderEditScopeError) return 409;
  if (error instanceof Error && error.message === 'Access denied') return 403;
  return 400;
}
