import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { PickingListController } from '@/controllers/picking-list.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new PickingListController();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; confirmationId: string }> }
) {
  const { id, confirmationId } = await params;
  const session = await auth();
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const result = await controller.cancelPacked(id, confirmationId, body, session?.user ?? null, request.nextUrl.origin);
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to cancel packed confirmation',
      status: 400,
    });
  }
}
