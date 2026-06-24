import { auth } from '@/auth';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { TrackingController } from '@/controllers/tracking.controller.server';

const controller = new TrackingController();

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError({ message: 'Unauthorized', status: 401 });
  if ((session.user.role as string) !== 'admin') return apiError({ message: 'Forbidden', status: 403 });

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get('dateFrom') ?? undefined;
  const dateTo = searchParams.get('dateTo') ?? undefined;
  const storeIds = searchParams.getAll('storeId');

  const result = await controller.countUnregistered({ dateFrom, dateTo, storeIds });
  return apiSuccess({ message: 'Count retrieved', data: result.data });
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
  const dateFrom = typeof data.dateFrom === 'string' ? data.dateFrom : undefined;
  const dateTo = typeof data.dateTo === 'string' ? data.dateTo : undefined;
  const storeIds = Array.isArray(data.storeIds)
    ? (data.storeIds as unknown[]).filter((id): id is string => typeof id === 'string')
    : [];

  const result = await controller.enqueueBulkRegister({ dateFrom, dateTo, storeIds });
  return apiSuccess({ message: result.message ?? 'Queued', data: result.data });
}
