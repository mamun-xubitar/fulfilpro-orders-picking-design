import { auth } from '@/auth';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { evaluateStaffAccess, getUserAuthPolicy } from '@/lib/auth-policy.server';
import { isRestrictedSessionRole } from '@/lib/roles';
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

  const isRestrictedSession = isRestrictedSessionRole(session.user.role);
  const policy = isRestrictedSession ? await getUserAuthPolicy(session.user.id) : null;
  const staffAccess = isRestrictedSession && policy ? evaluateStaffAccess(policy) : null;

  return apiSuccess({
    message: 'Session policy retrieved',
    data: {
      forceLogout: false,
      sessionTimeoutMinutes: isRestrictedSession && policy ? policy.sessionTimeoutMinutes : null,
      inactivityTimeoutMinutes: isRestrictedSession && policy ? policy.inactivityTimeoutMinutes : null,
      staffAccess,
    },
  });
}
