import prisma from '@/lib/prisma.server';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';

export type PurchaseOrderItemRow = {
  id: string;
  variantId: string | null;
  variantTitle: string;
  sku: string | null;
  quantity: number;
  receivedQuantity: number;
};

export type PurchaseOrderRow = {
  id: string;
  number: number;
  supplierId: string;
  supplierName: string;
  poEmail: string;
  productId: string;
  productTitle: string;
  status: PurchaseOrderStatus;
  deliveryDate: string | null;
  remark: string | null;
  createdById: string;
  createdByName: string;
  statusUpdatedById: string | null;
  statusUpdatedByName: string | null;
  statusUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItemRow[];
};

type PurchaseOrderWithItems = Prisma.PurchaseOrderGetPayload<{ include: { items: true } }>;

export class PurchaseOrderModel {
  async list(params: {
    productId: string;
    status?: PurchaseOrderStatus;
    dateFrom?: string;
    dateTo?: string;
    page: number;
    pageSize: number;
  }) {
    const { productId, status, dateFrom, dateTo, page, pageSize } = params;
    const where: Prisma.PurchaseOrderWhereInput = { productId };

    if (status) where.status = status;

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
        ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
      };
    }

    const [rows, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return { purchaseOrders: rows.map(toPurchaseOrderRow), total };
  }

  async findById(id: string): Promise<PurchaseOrderRow | null> {
    const row = await prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    return row ? toPurchaseOrderRow(row) : null;
  }

  async create(data: {
    supplierId: string;
    supplierName: string;
    poEmail: string;
    productId: string;
    productTitle: string;
    deliveryDate: Date | null;
    remark: string | null;
    createdById: string;
    createdByName: string;
    items: Array<{ variantId: string; variantTitle: string; sku: string | null; quantity: number }>;
  }) {
    const row = await prisma.purchaseOrder.create({
      data: {
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        poEmail: data.poEmail,
        productId: data.productId,
        productTitle: data.productTitle,
        status: 'REQUESTED',
        deliveryDate: data.deliveryDate,
        remark: data.remark,
        createdById: data.createdById,
        createdByName: data.createdByName,
        items: { create: data.items },
      },
      include: { items: true },
    });
    return toPurchaseOrderRow(row);
  }

  async updateStatus(id: string, status: PurchaseOrderStatus, actor: { id: string; name: string }) {
    const row = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status,
        statusUpdatedById: actor.id,
        statusUpdatedByName: actor.name,
        statusUpdatedAt: new Date(),
      },
      include: { items: true },
    });
    return toPurchaseOrderRow(row);
  }

  async receiveItems(id: string, receipts: Array<{ itemId: string; quantity: number }>, actor: { id: string; name: string }) {
    return prisma.$transaction(async (tx) => {
      for (const receipt of receipts) {
        await tx.purchaseOrderItem.update({
          where: { id: receipt.itemId },
          data: { receivedQuantity: { increment: receipt.quantity } },
        });
      }

      const items = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
      const status: PurchaseOrderStatus = items.every((item) => item.receivedQuantity >= item.quantity)
        ? 'RECEIVED'
        : 'PARTIALLY_RECEIVED';

      const row = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status,
          statusUpdatedById: actor.id,
          statusUpdatedByName: actor.name,
          statusUpdatedAt: new Date(),
        },
        include: { items: true },
      });
      return toPurchaseOrderRow(row);
    });
  }
}

function toPurchaseOrderRow(row: PurchaseOrderWithItems): PurchaseOrderRow {
  return {
    id: row.id,
    number: row.number,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    poEmail: row.poEmail,
    productId: row.productId,
    productTitle: row.productTitle,
    status: row.status,
    deliveryDate: row.deliveryDate?.toISOString() ?? null,
    remark: row.remark,
    createdById: row.createdById,
    createdByName: row.createdByName,
    statusUpdatedById: row.statusUpdatedById,
    statusUpdatedByName: row.statusUpdatedByName,
    statusUpdatedAt: row.statusUpdatedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map((item) => ({
      id: item.id,
      variantId: item.variantId,
      variantTitle: item.variantTitle,
      sku: item.sku,
      quantity: item.quantity,
      receivedQuantity: item.receivedQuantity,
    })),
  };
}
