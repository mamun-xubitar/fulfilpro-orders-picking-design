import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { FulfillmentRequestController } from '@/controllers/fulfillment-request.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

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
    const result = await controller.editFulfillment(orderId, fulfillmentId, body, role, userId);
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({ message: error instanceof Error ? error.message : 'Failed to edit fulfillment', status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) return apiError({ message: 'Unauthorized', status: 401 });

  const { id: orderId, fulfillmentId } = await params;
  const role = session.user.role as string;
  const userId = session.user.id;

  try {
    const result = await controller.cancelFulfillment(orderId, fulfillmentId, role, userId);
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({ message: error instanceof Error ? error.message : 'Failed to cancel fulfillment', status: 400 });
  }
}
