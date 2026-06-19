import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { DecorationController } from '@/controllers/decoration.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { isDecoratorRole } from '@/lib/roles';

const controller = new DecorationController();

type RouteParams = { params: Promise<{ id: string; lineItemId: string; workId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  const user = session?.user;
  const isAllowed = user?.role === 'admin' || isDecoratorRole(user?.role);
  if (!user?.id || !isAllowed) return apiError({ message: 'Forbidden', status: 403 });

  const { id, lineItemId, workId } = await params;

  try {
    const result = await controller.removeWork(id, lineItemId, workId, { id: user.id, role: user.role });
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({ message: error instanceof Error ? error.message : 'Failed to remove work', status: 400 });
  }
}
