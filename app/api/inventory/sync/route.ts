import { ProductController } from '@/controllers/product.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new ProductController();

export async function GET() {
  const session = await auth();
  const result = await controller.syncStatus(session);
  if ('error' in result) {
    const { error } = result as { error: { message: string; status: number } };
    return apiError({ message: error.message, status: error.status });
  }

  return apiSuccess({ message: 'Product sync status retrieved', data: result.data });
}

export async function POST(request: Request) {
  const session = await auth();
  const body = await request.json().catch(() => ({}));
  const result = await controller.triggerSync(body, session);
  if ('error' in result) {
    const { error } = result as { error: { message: string; status: number } };
    return apiError({ message: error.message, status: error.status });
  }

  return apiSuccess({
    message: result.data.alreadyRunning ? 'A product sync is already running' : 'Product sync queued',
    data: result.data,
    status: result.data.alreadyRunning ? 409 : 202,
  });
}
