import { NextRequest } from 'next/server';
import { PickingListController } from '@/controllers/picking-list.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new PickingListController();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await controller.list(searchParams);
    return apiSuccess({ message: 'Picking list retrieved', data: result.data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to load picking list',
      status: 400,
    });
  }
}
