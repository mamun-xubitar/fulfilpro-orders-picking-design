import { auth } from '@/auth';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { TrackingController } from '@/controllers/tracking.controller.server';

const controller = new TrackingController();

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError({ message: 'Unauthorized', status: 401 });
  const role = session.user.role as string;
  if (role !== 'admin' && role !== 'staff') return apiError({ message: 'Forbidden', status: 403 });

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');
  if (!orderId) return apiError({ message: 'orderId is required', status: 400 });

  const result = await controller.getSuggestedTracking(orderId);
  if ('error' in result && result.error) {
    return apiError({ message: result.error.message, status: result.error.status });
  }

  return apiSuccess({ message: 'Suggestion retrieved', data: result.data });
}
