import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { LoginAutoApprovalController } from '@/controllers/login-auto-approval.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new LoginAutoApprovalController();

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError({ message: 'Unauthorized', status: 401 });
  if (session.user.role !== 'admin') return apiError({ message: 'Only admins can view login auto-approvals', status: 403 });

  const result = await controller.list();
  return apiSuccess({ message: result.message, data: result.data });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return apiError({ message: 'Unauthorized', status: 401 });
  if (session.user.role !== 'admin') return apiError({ message: 'Only admins can update login auto-approvals', status: 403 });

  const result = await controller.setForToday(await request.json());
  if ('error' in result) {
    const { error } = result as { error: { message: string; errors?: string[]; status: number } };
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data });
}
