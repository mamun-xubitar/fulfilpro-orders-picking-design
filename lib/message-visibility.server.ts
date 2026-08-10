import prisma from '@/lib/prisma.server';
import { normalizeUserIdList, type EmailRuleUser } from '@/lib/email-rules.server';

const SETTINGS_ID = 'default';

async function getVisibilityMap(): Promise<Record<string, unknown> | null> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: SETTINGS_ID },
    select: { messageVisibilityByUser: true },
  });
  const map = settings?.messageVisibilityByUser;
  if (!map || typeof map !== 'object' || Array.isArray(map)) return null;
  return map as Record<string, unknown>;
}

// Until an admin explicitly saves a permission entry for this user, default to
// "every active admin" (the always-allow-admins baseline); once saved, the
// stored list is used as-is, so a specific admin can be excluded from it.
async function getEffectiveAllowedIds(userId: string): Promise<string[]> {
  const map = await getVisibilityMap();
  if (map && Object.prototype.hasOwnProperty.call(map, userId)) {
    return normalizeUserIdList(map[userId]);
  }
  const admins = await prisma.user.findMany({ where: { active: true, role: 'admin' }, select: { id: true } });
  return admins.map((a) => a.id);
}

export async function canSendMessage(params: {
  senderId: string;
  senderIsAdmin: boolean;
  recipientId: string;
}): Promise<boolean> {
  if (params.senderIsAdmin) return true;
  const allowedIds = await getEffectiveAllowedIds(params.senderId);
  return allowedIds.includes(params.recipientId);
}

export async function getMessageableUserIds(userId: string, isAdmin: boolean): Promise<string[]> {
  if (isAdmin) {
    const users = await prisma.user.findMany({
      where: { active: true, id: { not: userId } },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  const ids = (await getEffectiveAllowedIds(userId)).filter((id) => id !== userId);

  const activeUsers = await prisma.user.findMany({
    where: { id: { in: ids }, active: true },
    select: { id: true },
  });
  const activeIds = new Set(activeUsers.map((u) => u.id));

  return ids.filter((id) => activeIds.has(id));
}

export async function getMessageableUsers(userId: string, isAdmin: boolean): Promise<EmailRuleUser[]> {
  const ids = await getMessageableUserIds(userId, isAdmin);

  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
  });
}
