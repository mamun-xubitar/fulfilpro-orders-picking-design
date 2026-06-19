import prisma from '@/lib/prisma.server';
import { isDecoratorRole } from '@/lib/roles';

export async function getUserAllowedStoreIds(userId: string, role: string): Promise<string[] | null> {
  // Admins and decorators are not store-scoped. Decorator visibility is governed by
  // the decoration category / assignment filter in the orders model instead.
  if (role === 'admin' || isDecoratorRole(role)) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { allowedStoreIds: true },
  });

  if (!user) {
    return [];
  }

  const storeIds = Array.isArray(user.allowedStoreIds) ? user.allowedStoreIds : [];
  return storeIds.filter((id): id is string => typeof id === 'string');
}

export async function assertOrderStoreAccess(orderId: string, allowedStoreIds: string[] | null): Promise<void> {
  if (allowedStoreIds === null) {
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { storeId: true },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (!allowedStoreIds.includes(order.storeId)) {
    throw new Error('Access denied');
  }
}
