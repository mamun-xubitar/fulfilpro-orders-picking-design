import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { PickingListController } from '@/controllers/picking-list.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new PickingListController();

export async function POST(request: NextRequest) {
  const session = await auth();
  const body = await request.json() as unknown;

  try {
    const result = await controller.recordPrints(body, session?.user ?? null);
    return apiSuccess({ message: result.message, data: result.data, status: 201 });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to record picking slip print',
      status: 400,
    });
  }
}
