import { auth } from '@/auth';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { TrackingController } from '@/controllers/tracking.controller.server';

const controller = new TrackingController();

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError({ message: 'Unauthorized', status: 401 });
  if ((session.user.role as string) !== 'admin') return apiError({ message: 'Forbidden', status: 403 });

  const result = await controller.getSyncStatus();
  return apiSuccess({ message: 'Sync status retrieved', data: result.data });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError({ message: 'Unauthorized', status: 401 });
  if ((session.user.role as string) !== 'admin') return apiError({ message: 'Forbidden', status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError({ message: 'Invalid request body', status: 400 });
  }

  const data = body as Record<string, unknown>;
  const days = typeof data.days === 'number' ? data.days : null;
  if (!days) return apiError({ message: 'days is required', status: 400 });

  const storeIds = Array.isArray(data.storeIds)
    ? (data.storeIds as unknown[]).filter((id): id is string => typeof id === 'string')
    : [];

  const result = await controller.enqueueSyncStatus({ days, storeIds });
  if ('error' in result && result.error) return apiError({ message: result.error.message, status: result.error.status });
  if (!('data' in result)) return apiError({ message: 'Unexpected error', status: 500 });
  return apiSuccess({ message: result.message ?? 'Queued', data: result.data });
}
