import { auth } from '@/auth';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { evaluateStaffAccess, getAuthPolicy } from '@/lib/auth-policy.server';
import { isStaffLikeRole } from '@/lib/roles';
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
  const isStaffLike = isStaffLikeRole(session.user.role);
  const staffAccess = isStaffLike ? evaluateStaffAccess(policy) : null;

  return apiSuccess({
    message: 'Session policy retrieved',
    data: {
      forceLogout: false,
      sessionTimeoutMinutes: isStaffLike ? policy.sessionTimeoutMinutes : null,
      inactivityTimeoutMinutes: isStaffLike ? policy.inactivityTimeoutMinutes : null,
      staffAccess,
    },
  });
}
