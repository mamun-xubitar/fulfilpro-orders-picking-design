import prisma from '@/lib/prisma.server';

export type RestrictedUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  loginAutoApproveDate: string | null;
};

export class LoginAutoApprovalModel {
  async listRestrictedUsers(): Promise<RestrictedUserRow[]> {
    return prisma.user.findMany({
      where: { active: true, role: { not: 'admin' } },
      select: { id: true, name: true, email: true, role: true, loginAutoApproveDate: true },
      orderBy: { name: 'asc' },
    });
  }

  async setForToday(userIds: string[], today: string) {
    await prisma.$transaction([
      prisma.user.updateMany({
        where: { id: { in: userIds }, active: true, role: { not: 'admin' } },
        data: { loginAutoApproveDate: today },
      }),
      prisma.user.updateMany({
        where: { id: { notIn: userIds }, active: true, role: { not: 'admin' } },
        data: { loginAutoApproveDate: null },
      }),
    ]);
  }
}
