import { auth } from '@/auth';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { evaluateStaffAccess, getAuthPolicy } from '@/lib/auth-policy.server';
import prisma from '@/lib/prisma.server';

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return apiError({ message: 'Authentication required', status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { active: true },
  });

  if (!dbUser || !dbUser.active) {
    return apiSuccess({
      message: 'Session policy retrieved',
      data: {
        forceLogout: true,
        sessionTimeoutMinutes: null,
        inactivityTimeoutMinutes: null,
        staffAccess: null,
      },
    });
  }

  const policy = await getAuthPolicy();
  const staffAccess = session.user.role === 'staff' ? evaluateStaffAccess(policy) : null;

  return apiSuccess({
    message: 'Session policy retrieved',
    data: {
      forceLogout: false,
      sessionTimeoutMinutes: session.user.role === 'staff' ? policy.sessionTimeoutMinutes : null,
      inactivityTimeoutMinutes: session.user.role === 'staff' ? policy.inactivityTimeoutMinutes : null,
      staffAccess,
    },
  });
}
