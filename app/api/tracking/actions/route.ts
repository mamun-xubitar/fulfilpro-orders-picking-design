import { auth } from '@/auth';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { TrackingController } from '@/controllers/tracking.controller.server';

const controller = new TrackingController();

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError({ message: 'Unauthorized', status: 401 });
  }
  if ((session.user.role as string) !== 'admin') {
    return apiError({ message: 'Forbidden — admin only', status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError({ message: 'Invalid request body', status: 400 });
  }

  const data = body as Record<string, unknown>;
  const orderId = typeof data.orderId === 'string' ? data.orderId : null;
  const action = typeof data.action === 'string' ? data.action : null;
  const trackingNumber = typeof data.trackingNumber === 'string' ? data.trackingNumber : null;
  const carrier = typeof data.carrier === 'number' ? data.carrier : null;

  if (!orderId || !action) {
    return apiError({ message: 'orderId and action are required', status: 400 });
  }

  let result;
  if (action === 'register') {
    result = await controller.register(orderId);
  } else if (action === 'pause') {
    if (!trackingNumber) return apiError({ message: 'trackingNumber is required for pause', status: 400 });
    result = await controller.pause(orderId, trackingNumber);
  } else if (action === 'restart') {
    if (!trackingNumber) return apiError({ message: 'trackingNumber is required for restart', status: 400 });
    result = await controller.restart(orderId, trackingNumber);
  } else if (action === 'register-single') {
    if (!trackingNumber) return apiError({ message: 'trackingNumber is required', status: 400 });
    result = await controller.registerSingle(orderId, trackingNumber, carrier);
  } else {
    return apiError({ message: 'Invalid action', status: 400 });
  }

  if ('error' in result && result.error) {
    return apiError({ message: result.error.message, status: result.error.status });
  }

  return apiSuccess({ message: result.message ?? 'Done', data: result.data });
}
