import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { markRead } from '@/lib/notifications.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { DecorationController } from '@/controllers/decoration.controller.server';
import prisma from '@/lib/prisma.server';

const controller = new DecorationController();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return apiError({ message: 'Unauthorized', status: 401 });

  const { id } = await params;

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return apiError({ message: 'Invalid request body', status: 400 });
  }

  const { action } = body;

  try {
    if (action === 'read') {
      await markRead(id, user.id);
      return apiSuccess({ message: 'Marked as read', data: null });
    }

    if (action === 'accept' || action === 'reject') {
      if (user.role !== 'admin') return apiError({ message: 'Forbidden', status: 403 });

      const notif = await prisma.notification.findFirst({ where: { id, recipientId: user.id } });
      if (!notif) return apiError({ message: 'Notification not found', status: 404 });
      if (!notif.relatedRequestId) return apiError({ message: 'No related request', status: 400 });
      if (notif.actionStatus) return apiError({ message: 'Already acted on', status: 409 });

      const result = await controller.actOnRequest(
        notif.relatedRequestId,
        action === 'accept' ? 'approve' : 'reject',
        { id: user.id, name: user.name ?? '' }
      );
      return apiSuccess({ message: result.message, data: null });
    }

    return apiError({ message: "action must be 'read', 'accept', or 'reject'", status: 400 });
  } catch (error) {
    return apiError({ message: error instanceof Error ? error.message : 'Failed', status: 400 });
  }
}
