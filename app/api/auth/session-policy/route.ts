import { auth } from '@/auth';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { evaluateStaffAccess, getAuthPolicy } from '@/lib/auth-policy.server';

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return apiError({ message: 'Authentication required', status: 401 });
  }

  const policy = await getAuthPolicy();
  const staffAccess = session.user.role === 'staff' ? evaluateStaffAccess(policy) : null;

  return apiSuccess({
    message: 'Session policy retrieved',
    data: {
      sessionTimeoutMinutes: policy.sessionTimeoutMinutes,
      staffAccess,
    },
  });
}
