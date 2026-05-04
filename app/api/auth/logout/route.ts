import { auth } from '@/auth';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import prisma from '@/lib/prisma.server';

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError({ message: 'Authentication required', status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      isLoggedIn: false,
      lastLogoutAt: new Date(),
    },
  });

  return apiSuccess({ message: 'User logged out', data: { loggedOut: true } });
}
