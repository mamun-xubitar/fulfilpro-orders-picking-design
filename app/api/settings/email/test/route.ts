import { auth } from '@/auth';
import { SettingsController } from '@/controllers/settings.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new SettingsController();

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return apiError({ message: 'Unauthorized', status: 401 });
  if (session.user.role !== 'admin') return apiError({ message: 'Only admins can send a test email', status: 403 });
  if (!session.user.email) return apiError({ message: 'Your account has no email address to send a test to', status: 400 });

  const result = await controller.sendTestEmail(session.user.email);
  if ('error' in result) {
    const { error } = result as { error: { message: string; status: number } };
    return apiError({ message: error.message, status: error.status });
  }
  return apiSuccess({ message: result.message!, data: null });
}
