import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { DecorationController } from '@/controllers/decoration.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { isDecoratorRole } from '@/lib/roles';

const controller = new DecorationController();

type RouteParams = { params: Promise<{ id: string; lineItemId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !isDecoratorRole(user.role)) return apiError({ message: 'Forbidden', status: 403 });

  const { id, lineItemId } = await params;

  try {
    const result = await controller.markWorkDone(id, lineItemId, await request.json(), {
      id: user.id,
      name: user.name ?? '',
      email: user.email ?? '',
      role: user.role,
    });
    return apiSuccess({ message: result.message, data: result.data, status: 201 });
  } catch (error) {
    return apiError({ message: error instanceof Error ? error.message : 'Failed to mark as done', status: 400 });
  }
}
