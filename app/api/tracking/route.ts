import { auth } from '@/auth';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { TrackingController } from '@/controllers/tracking.controller.server';

const controller = new TrackingController();

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError({ message: 'Unauthorized', status: 401 });
  }

  const role = session.user.role as string;
  if (role !== 'admin' && role !== 'staff') {
    return apiError({ message: 'Forbidden', status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const result = await controller.list(searchParams, { userId: session.user.id, role });
  return apiSuccess({ message: 'Tracking records retrieved', data: result.data });
}
