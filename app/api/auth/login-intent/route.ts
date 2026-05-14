import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { evaluateStaffAccess, getUserAuthPolicy } from '@/lib/auth-policy.server';
import { verifyPassword } from '@/lib/password';
import { createStaffLoginApproval } from '@/lib/staff-login-approval.server';
import { isRestrictedSessionRole } from '@/lib/roles';
import prisma from '@/lib/prisma.server';

export async function POST(request: NextRequest) {
  const body = await request.json() as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return apiError({ message: 'Invalid email or password', status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.active || !verifyPassword(password, user.password)) {
    return apiError({ message: 'Invalid email or password', status: 401 });
  }

  if (!isRestrictedSessionRole(user.role)) {
    return apiSuccess({ message: 'Login can continue', data: { mode: 'direct' as const } });
  }

  const policy = await getUserAuthPolicy(user.id);
  const access = evaluateStaffAccess(policy);

  if (!access.allowed) {
    return apiError({
      message: 'Staff access is restricted at this time',
      status: 403,
      errors: [JSON.stringify(access)],
    });
  }

  try {
    const approval = await createStaffLoginApproval(user);
    return apiSuccess({
      message: 'Admin approval requested',
      data: {
        mode: 'approval_required' as const,
        requestId: approval.id,
        expiresAt: approval.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to send admin approval email',
      status: 500,
    });
  }
}
