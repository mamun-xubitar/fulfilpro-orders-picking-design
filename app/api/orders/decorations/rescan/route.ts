import { auth } from '@/auth';
import { OrderController } from '@/controllers/order.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new OrderController();

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== 'admin') return apiError({ message: 'Forbidden', status: 403 });

  try {
    const result = await controller.getDecorationRescanStatus();
    return apiSuccess({ message: 'Decoration re-scan status retrieved', data: result.data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to load decoration re-scan status',
      status: 500,
    });
  }
}

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== 'admin') return apiError({ message: 'Forbidden', status: 403 });

  try {
    const result = await controller.enqueueDecorationRescan();
    return apiSuccess({
      message: result.message,
      data: result.data,
      status: result.data.alreadyRunning ? 409 : 202,
    });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to re-scan decorations',
      status: 400,
    });
  }
}
