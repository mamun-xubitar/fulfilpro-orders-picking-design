import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { DecorationController } from '@/controllers/decoration.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { isDecoratorRole } from '@/lib/roles';

const controller = new DecorationController();

export async function POST(request: NextRequest) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !isDecoratorRole(user.role)) return apiError({ message: 'Forbidden', status: 403 });

  let body: { orderId?: string; lineItemId?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return apiError({ message: 'Invalid request body', status: 400 });
  }

  const orderId = typeof body.orderId === 'string' ? body.orderId : '';
  const lineItemId = typeof body.lineItemId === 'string' ? body.lineItemId : '';
  if (!orderId || !lineItemId) return apiError({ message: 'orderId and lineItemId are required', status: 400 });

  try {
    const result = await controller.requestEditAccess(orderId, lineItemId, body, {
      id: user.id,
      name: user.name ?? '',
      email: user.email ?? '',
      role: user.role,
    }, new URL(request.url).origin);
    return apiSuccess({ message: result.message, data: result.data, status: 201 });
  } catch (error) {
    return apiError({ message: error instanceof Error ? error.message : 'Failed to request edit access', status: 400 });
  }
}
