import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { FulfillmentRequestController } from '@/controllers/fulfillment-request.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new FulfillmentRequestController();

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return apiError({ message: 'Unauthorized', status: 401 });

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');
  const pending = searchParams.get('pending') === 'true';
  const role = session.user.role as string;
  const userId = session.user.id;

  try {
    if (pending) {
      if (role !== 'admin') return apiError({ message: 'Forbidden', status: 403 });
      const result = await controller.listPending();
      return apiSuccess({ message: result.message, data: result.data });
    }

    if (orderId) {
      const result = role === 'admin'
        ? await controller.listForOrder(orderId)
        : await controller.listForStaff(userId);
      const filtered = role === 'staff'
        ? { ...result, data: result.data.filter((r) => r.orderId === orderId) }
        : result;
      return apiSuccess({ message: filtered.message, data: filtered.data });
    }

    if (role === 'staff') {
      const result = await controller.listForStaff(userId);
      return apiSuccess({ message: result.message, data: result.data });
    }

    const result = await controller.listPending();
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({ message: error instanceof Error ? error.message : 'Failed to load requests', status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return apiError({ message: 'Unauthorized', status: 401 });
  if ((session.user.role as string) !== 'staff') {
    return apiError({ message: 'Only staff can submit permission requests', status: 403 });
  }

  const body = await request.json() as unknown;
  const origin = request.headers.get('origin') ?? request.headers.get('referer')?.replace(/\/[^/]*$/, '') ?? '';

  try {
    const result = await controller.createRequest(
      body,
      { id: session.user.id, name: session.user.name ?? '', email: session.user.email ?? '' },
      origin
    );
    return apiSuccess({ message: result.message, data: result.data, status: 201 });
  } catch (error) {
    return apiError({ message: error instanceof Error ? error.message : 'Failed to submit request', status: 400 });
  }
}
