import prisma from '@/lib/prisma.server';
import { normalizeUserIdList, type EmailRuleUser } from '@/lib/email-rules.server';

const SETTINGS_ID = 'default';

async function getConfiguredVisibleUserIds(userId: string): Promise<string[]> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: SETTINGS_ID },
    select: { taskVisibilityByUser: true },
  });

  const map = settings?.taskVisibilityByUser;
  if (!map || typeof map !== 'object' || Array.isArray(map)) return [];
  const ids = (map as Record<string, unknown>)[userId];
  return normalizeUserIdList(ids);
}

export async function getTaskVisibleUserIds(userId: string): Promise<string[]> {
  const configuredIds = await getConfiguredVisibleUserIds(userId);
  const ids = Array.from(new Set([...configuredIds, userId]));

  const activeUsers = await prisma.user.findMany({
    where: { id: { in: ids }, active: true },
    select: { id: true },
  });
  const activeIds = new Set(activeUsers.map((u) => u.id));

  return ids.filter((id) => id === userId || activeIds.has(id));
}

export async function getTaskVisibleUsers(userId: string): Promise<EmailRuleUser[]> {
  const ids = await getTaskVisibleUserIds(userId);

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
  });

  return users;
}
