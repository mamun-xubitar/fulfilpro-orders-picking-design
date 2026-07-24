import { ProductController } from '@/controllers/product.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';
import { getUserAllowedStoreIds } from '@/lib/store-access.server';

const controller = new ProductController();

export async function POST(request: Request) {
  const session = await auth();
  let allowedStoreIds: string[] | null | undefined;

  if (session?.user?.id && session?.user?.role) {
    allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
  }

  const body = await request.json().catch(() => ({}));
  const result = await controller.enqueueBulk(body, session, allowedStoreIds);
  if ('error' in result) {
    const { error } = result as { error: { message: string; status: number } };
    return apiError({ message: error.message, status: error.status });
  }

  return apiSuccess({ message: 'Bulk action queued', data: result.data, status: 202 });
}

export async function GET(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId') ?? '';
  if (!jobId) return apiError({ message: 'jobId is required', status: 400 });

  const result = await controller.bulkStatus(jobId, session);
  if ('error' in result) {
    const { error } = result as { error: { message: string; status: number } };
    return apiError({ message: error.message, status: error.status });
  }

  return apiSuccess({ message: 'Bulk action status retrieved', data: result.data });
}
