import { NextRequest } from 'next/server';
import { PickingListController } from '@/controllers/picking-list.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { auth } from '@/auth';
import { getUserAllowedStoreIds } from '@/lib/store-access.server';

const controller = new PickingListController();

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    let allowedStoreIds: string[] | null | undefined;
    
    if (session?.user?.id && session?.user?.role) {
      allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
    }
    
    const result = await controller.list(searchParams, allowedStoreIds);
    return apiSuccess({ message: 'Picking list retrieved', data: result.data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to load picking list',
      status: 400,
    });
  }
}
