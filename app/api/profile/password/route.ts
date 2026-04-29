import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import prisma from '@/lib/prisma.server';
import { saltAndHashPassword, verifyPassword } from '@/lib/password';

export async function PATCH(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError({ message: 'Authentication required', status: 401 });
  }

  const body = await request.json() as Record<string, unknown>;
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';
  const errors: string[] = [];

  if (!currentPassword) errors.push('Current password is required');
  if (newPassword.length < 8) errors.push('New password must be at least 8 characters');
  if (newPassword !== confirmPassword) errors.push('Passwords do not match');

  if (errors.length) {
    return apiError({ message: 'Validation failed', errors, status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  if (!user || !verifyPassword(currentPassword, user.password)) {
    return apiError({ message: 'Current password is incorrect', errors: ['Current password is incorrect'], status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: saltAndHashPassword(newPassword),
      isTempPassword: false,
    },
  });

  return apiSuccess({ message: 'Password updated successfully', data: null });
}
