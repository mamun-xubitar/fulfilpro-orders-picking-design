import prisma from '@/lib/prisma.server';

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  orderId: string | null;
  orderNumber: string | null;
  lineItemId: string | null;
  relatedRequestId: string | null;
  actionable: boolean;
  actionStatus: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function createNotification(data: {
  recipientId: string;
  type: string;
  title: string;
  body: string;
  orderId?: string;
  orderNumber?: string;
  lineItemId?: string;
  relatedRequestId?: string;
  actionable?: boolean;
}) {
  try {
    await prisma.notification.create({ data });
  } catch (error) {
    console.error('Failed to create notification', error);
  }
}

export async function listForUser(userId: string): Promise<{ notifications: NotificationRow[]; unreadCount: number }> {
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({ where: { recipientId: userId, readAt: null } }),
  ]);
  return { notifications: rows.map(toRow), unreadCount };
}

export async function markRead(notificationId: string, userId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, recipientId: userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({
    where: { recipientId: userId, readAt: null },
    data: { readAt: new Date() },
  });
}

function toRow(row: {
  id: string;
  type: string;
  title: string;
  body: string;
  orderId: string | null;
  orderNumber: string | null;
  lineItemId: string | null;
  relatedRequestId: string | null;
  actionable: boolean;
  actionStatus: string | null;
  readAt: Date | null;
  createdAt: Date;
}): NotificationRow {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    orderId: row.orderId,
    orderNumber: row.orderNumber,
    lineItemId: row.lineItemId,
    relatedRequestId: row.relatedRequestId,
    actionable: row.actionable,
    actionStatus: row.actionStatus,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
