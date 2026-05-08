import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { BackInStockController } from '@/controllers/back-in-stock.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new BackInStockController();

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) return apiError({ message: 'Unauthorized', status: 401 });

  try {
    const { id } = await params;
    const result = await controller.listForOrder(id, {
      id: session.user.id,
      role: String(session.user.role ?? ''),
    });
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({ message: error instanceof Error ? error.message : 'Failed to load back in stock requests', status: 400 });
  }
}
