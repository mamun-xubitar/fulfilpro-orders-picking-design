import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { BackInStockController } from '@/controllers/back-in-stock.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new BackInStockController();

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return apiError({ message: 'Unauthorized', status: 401 });

  try {
    const result = await controller.list(request.nextUrl.searchParams, {
      id: session.user.id,
      role: String(session.user.role ?? ''),
    });
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({ message: error instanceof Error ? error.message : 'Failed to load back in stock requests', status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return apiError({ message: 'Unauthorized', status: 401 });

  try {
    const result = await controller.create(await request.json(), {
      id: session.user.id,
      name: session.user.name ?? '',
      email: session.user.email ?? '',
    });
    return apiSuccess({ message: result.message, data: result.data, status: 201 });
  } catch (error) {
    return apiError({ message: error instanceof Error ? error.message : 'Failed to submit back in stock request', status: 400 });
  }
}
