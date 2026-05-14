import prisma from '@/lib/prisma.server';

export async function getUserAllowedStoreIds(userId: string, role: string): Promise<string[] | null> {
  if (role === 'admin') {
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
