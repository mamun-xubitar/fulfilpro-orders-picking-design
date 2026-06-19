import { auth } from '@/auth';
import { listForUser, markAllRead } from '@/lib/notifications.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return apiError({ message: 'Unauthorized', status: 401 });
  const data = await listForUser(userId);
  return apiSuccess({ message: 'Notifications retrieved', data });
}

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return apiError({ message: 'Unauthorized', status: 401 });
  await markAllRead(userId);
  return apiSuccess({ message: 'All marked as read', data: null });
}
