import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { DecorationController } from '@/controllers/decoration.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new DecorationController();

// Admin in-app approve/reject of a decoration edit-access request.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  const session = await auth();
  const user = session?.user;
  if (user?.role !== 'admin' || !user.id) return apiError({ message: 'Forbidden', status: 403 });

  const { requestId } = await params;

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return apiError({ message: 'Invalid request body', status: 400 });
  }

  try {
    const result = await controller.actOnRequest(requestId, body.action ?? '', { id: user.id, name: user.name ?? '' });
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({ message: error instanceof Error ? error.message : 'Failed to update request', status: 400 });
  }
}
