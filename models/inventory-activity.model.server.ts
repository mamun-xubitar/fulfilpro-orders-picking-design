import prisma from '@/lib/prisma.server';
import { Prisma } from '@prisma/client';

export const ACTIVITY_SORT_KEYS = ['createdAt', 'productName', 'type', 'actorName'] as const;
export type ActivitySortKey = (typeof ACTIVITY_SORT_KEYS)[number];

export type InventoryActivityRow = {
  id: string;
  type: string;
  message: string;
  actorName: string;
  createdAt: string;
  /** Set when the entry is an adjustment, so History can open its lines. */
  adjustmentBatchId: string | null;
  supplierProductId: string;
  productName: string;
  itemNo: string;
};

export class InventoryActivityModel {
  /** Every product's activity, for the History tab. */
  async list(params: {
    search?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: ActivitySortKey;
    dir?: 'asc' | 'desc';
    page: number;
    pageSize: number;
  }): Promise<{ activities: InventoryActivityRow[]; total: number }> {
    const { search, type, dateFrom, dateTo, sort = 'createdAt', dir = 'desc', page, pageSize } = params;
    const where: Prisma.InventoryActivityWhereInput = {};

    if (type) where.type = type;
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
        ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
      };
    }
    const term = search?.trim();
    if (term) {
      where.OR = [
        { message: { contains: term, mode: 'insensitive' } },
        { actorName: { contains: term, mode: 'insensitive' } },
        { supplierProduct: { name: { contains: term, mode: 'insensitive' } } },
        { supplierProduct: { itemNo: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const orderBy: Prisma.InventoryActivityOrderByWithRelationInput[] =
      sort === 'productName' ? [{ supplierProduct: { name: dir } }, { createdAt: 'desc' }] : sort === 'createdAt' ? [{ createdAt: dir }] : [{ [sort]: dir }, { createdAt: 'desc' }];

    const [rows, total] = await Promise.all([
      prisma.inventoryActivity.findMany({
        where,
        include: { supplierProduct: { select: { name: true, itemNo: true } } },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.inventoryActivity.count({ where }),
    ]);
    return {
      activities: rows.map((r) => ({
        id: r.id,
        type: r.type,
        message: r.message,
        actorName: r.actorName,
        createdAt: r.createdAt.toISOString(),
        adjustmentBatchId: r.adjustmentBatchId,
        supplierProductId: r.supplierProductId,
        productName: r.supplierProduct.name,
        itemNo: r.supplierProduct.itemNo,
      })),
      total,
    };
  }
}
