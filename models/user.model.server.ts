import { evaluateStaffAccess, getSessionExpiresAt, getUserAuthPolicy } from '@/lib/auth-policy.server';
import { saltAndHashPassword } from '@/lib/password';
import prisma from '@/lib/prisma.server';
import { isRestrictedSessionRole } from '@/lib/roles';
import { Prisma } from '@prisma/client';

const DELETED_SUFFIX = ' (deleted)';

/** History tables that snapshot a performer as [table, id column, name column]. Add any new `*ById`/`*ByName` history column here. */
const HISTORY_ACTOR_COLUMNS = [
  ['InventoryActivity', 'actorId', 'actorName'],
  ['StockAdjustmentBatch', 'actorId', 'actorName'],
  ['StockAdjustment', 'actorId', 'actorName'],
  ['Stocktake', 'startedById', 'startedByName'],
  ['Stocktake', 'countedById', 'countedByName'],
  ['Stocktake', 'syncedById', 'syncedByName'],
  ['PurchaseOrder', 'createdById', 'createdByName'],
  ['PurchaseOrder', 'statusUpdatedById', 'statusUpdatedByName'],
  ['PurchaseOrderPayment', 'createdById', 'createdByName'],
  ['PurchaseOrderPayment', 'updatedById', 'updatedByName'],
  ['PurchaseOrderPaymentHistory', 'actorId', 'actorName'],
  ['PurchaseOrderReceipt', 'receivedById', 'receivedByName'],
  ['Invoice', 'createdById', 'createdByName'],
] as const;

type SessionStatus = 'logged_in' | 'logout' | 'access_restricted' | 'session_timeout';

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  isTempPassword: boolean;
  isLoggedIn: boolean;
  lastLoginAt: string | null;
  lastLogoutAt: string | null;
  sessionStatus: SessionStatus;
  sessionStatusLabel: string;
  sessionStatusDetail: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserData = {
  name: string;
  email: string;
  role: string;
  password: string;
  isTempPassword: boolean;
};

export type UpdateUserData = Partial<{
  name: string;
  email: string;
  role: string;
  password: string;
  active: boolean;
  isTempPassword: boolean;
}>;

export class UserModel {
  async findMany(): Promise<UserRow[]> {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const now = Date.now();

    return Promise.all(users.map(async (user) => {
      const policy = isRestrictedSessionRole(user.role) ? await getUserAuthPolicy(user.id) : null;
      const staffAccess = policy ? evaluateStaffAccess(policy) : null;
      return toUserRow(user, { policy, staffAccess, now });
    }));
  }

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async create(data: CreateUserData): Promise<UserRow> {
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        password: saltAndHashPassword(data.password),
        active: true,
        isTempPassword: data.isTempPassword,
        isLoggedIn: false,
      },
    });

    return toUserRow(user);
  }

  async update(id: string, data: UpdateUserData): Promise<UserRow> {
    const updateData = {
      ...data,
      ...(data.password ? { password: saltAndHashPassword(data.password) } : {}),
    };
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return toUserRow(user);
  }

  async delete(id: string): Promise<void> {
    await prisma.$transaction([
      ...HISTORY_ACTOR_COLUMNS.map(
        ([table, idColumn, nameColumn]) =>
          prisma.$executeRaw`UPDATE ${Prisma.raw(`"${table}"`)} SET ${Prisma.raw(`"${nameColumn}"`)} = ${Prisma.raw(`"${nameColumn}"`)} || ${DELETED_SUFFIX} WHERE ${Prisma.raw(`"${idColumn}"`)} = ${id}`
      ),
      prisma.user.delete({ where: { id } }),
    ]);
  }
}

function toUserRow(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  isTempPassword: boolean;
  isLoggedIn: boolean;
  lastLoginAt: Date | null;
  lastLogoutAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}, context?: {
  policy: Awaited<ReturnType<typeof getUserAuthPolicy>> | null;
  staffAccess: ReturnType<typeof evaluateStaffAccess> | null;
  now: number;
}): UserRow {
  const sessionStatus = getSessionStatus(user, context);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    isTempPassword: user.isTempPassword,
    isLoggedIn: user.isLoggedIn,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    lastLogoutAt: user.lastLogoutAt?.toISOString() ?? null,
    sessionStatus: sessionStatus.status,
    sessionStatusLabel: sessionStatus.label,
    sessionStatusDetail: sessionStatus.detail,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function getSessionStatus(user: {
  role: string;
  isLoggedIn: boolean;
  lastLoginAt: Date | null;
}, context?: {
  policy: Awaited<ReturnType<typeof getUserAuthPolicy>> | null;
  staffAccess: ReturnType<typeof evaluateStaffAccess> | null;
  now: number;
}): { status: SessionStatus; label: string; detail: string } {
  if (!user.isLoggedIn || !user.lastLoginAt) {
    return { status: 'logout', label: 'Logout', detail: 'User is logged out' };
  }

  if (isRestrictedSessionRole(user.role) && context && context.policy && context.staffAccess) {
    const loginAt = user.lastLoginAt.getTime();
    const expiresAt = getSessionExpiresAt(loginAt, context.policy.sessionTimeoutMinutes);

    if (expiresAt <= context.now) {
      return { status: 'session_timeout', label: 'Session timeout', detail: 'Staff session timed out' };
    }

    if (!context.staffAccess.allowed) {
      return {
        status: 'access_restricted',
        label: 'Access restricted',
        detail: `Allowed ${context.staffAccess.staffAccessDays.join(', ')} ${context.staffAccess.staffAccessStart}-${context.staffAccess.staffAccessEnd}`,
      };
    }
  }

  return { status: 'logged_in', label: 'Logged in', detail: 'User is logged in' };
}
