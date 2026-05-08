import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { BackInStockController } from '@/controllers/back-in-stock.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new BackInStockController();

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) return apiError({ message: 'Unauthorized', status: 401 });
  if (session.user.role !== 'admin') return apiError({ message: 'Only admins can update back in stock requests', status: 403 });

  try {
    const { id } = await params;
    const result = await controller.adminUpdate(id, await request.json(), {
      id: session.user.id,
      name: session.user.name ?? '',
      email: session.user.email ?? '',
      role: 'admin',
    });
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({ message: error instanceof Error ? error.message : 'Failed to update back in stock request', status: 400 });
  }
}
