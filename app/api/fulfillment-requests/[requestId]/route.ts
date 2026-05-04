import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { FulfillmentRequestController } from '@/controllers/fulfillment-request.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new FulfillmentRequestController();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError({ message: 'Unauthorized', status: 401 });
  if ((session.user.role as string) !== 'admin') return apiError({ message: 'Forbidden', status: 403 });

  const { requestId } = await params;
  const body = await request.json() as { action?: unknown };
  const action = body.action;

  if (action !== 'approve' && action !== 'reject') {
    return apiError({ message: 'action must be "approve" or "reject"', status: 400 });
  }

  try {
    const result = action === 'approve'
      ? await controller.approve(requestId, session.user.id, session.user.name ?? '')
      : await controller.reject(requestId, session.user.id, session.user.name ?? '');
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({ message: error instanceof Error ? error.message : 'Failed to update request', status: 400 });
  }
}
