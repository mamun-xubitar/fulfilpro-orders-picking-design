import prisma from '@/lib/prisma.server';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';

export type PurchaseOrderItemRow = {
  id: string;
  variantId: string | null;
  variantTitle: string;
  sku: string | null;
  quantity: number;
  receivedQuantity: number;
  unitCost: number | null;
};

export type PurchaseOrderRow = {
  id: string;
  number: number;
  supplierId: string;
  supplierName: string;
  poEmail: string;
  supplierProductId: string;
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
    supplierProductId: string;
    status?: PurchaseOrderStatus;
    dateFrom?: string;
    dateTo?: string;
    page: number;
    pageSize: number;
  }) {
    const { supplierProductId, status, dateFrom, dateTo, page, pageSize } = params;
    const where: Prisma.PurchaseOrderWhereInput = { supplierProductId };

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
    supplierProductId: string;
    productTitle: string;
    deliveryDate: Date | null;
    remark: string | null;
    createdById: string;
    createdByName: string;
    items: Array<{ variantId: string; variantTitle: string; sku: string | null; quantity: number; unitCost?: number }>;
  }) {
    const row = await prisma.purchaseOrder.create({
      data: {
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        poEmail: data.poEmail,
        supplierProductId: data.supplierProductId,
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
      data: { status, statusUpdatedById: actor.id, statusUpdatedByName: actor.name, statusUpdatedAt: new Date() },
      include: { items: true },
    });
    return toPurchaseOrderRow(row);
  }

  /**
   * Applies received quantities to the hub catalogue: bumps stock on hand for each existing
   * variant, and creates a new variant when the receipt references a colour/size the catalogue
   * doesn't have yet (e.g. the supplier substituted or added an item).
   */
  async receive(
    id: string,
    receipts: Array<{ itemId?: string; variantId?: string; colour?: string; size?: string; sku?: string | null; quantity: number }>,
    actor: { id: string; name: string }
  ) {
    return prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUniqueOrThrow({ where: { id }, include: { items: true } });
      const itemById = new Map(po.items.map((item) => [item.id, item]));

      for (const receipt of receipts) {
        let variantId = receipt.variantId ?? null;
        let unitCost: Prisma.Decimal | null = null;

        if (receipt.itemId) {
          const item = itemById.get(receipt.itemId);
          if (!item) continue;
          variantId = item.variantId;
          unitCost = item.unitCost;

          if (!variantId && receipt.colour && receipt.size) {
            const created = await tx.supplierProductVariant.create({
              data: { supplierProductId: po.supplierProductId, colour: receipt.colour, size: receipt.size, sku: receipt.sku ?? null },
            });
            variantId = created.id;
            await tx.purchaseOrderItem.update({ where: { id: item.id }, data: { variantId } });
          }

          await tx.purchaseOrderItem.update({ where: { id: item.id }, data: { receivedQuantity: { increment: receipt.quantity } } });
        } else if (receipt.colour && receipt.size) {
          const existing = await tx.supplierProductVariant.findUnique({
            where: { supplierProductId_colour_size: { supplierProductId: po.supplierProductId, colour: receipt.colour, size: receipt.size } },
          });
          variantId = existing?.id ?? (await tx.supplierProductVariant.create({
            data: { supplierProductId: po.supplierProductId, colour: receipt.colour, size: receipt.size, sku: receipt.sku ?? null },
          })).id;
        }

        if (variantId) {
          await tx.supplierProductVariant.update({
            where: { id: variantId },
            data: { stockOnHand: { increment: receipt.quantity }, ...(unitCost !== null && { buyPrice: unitCost }) },
          });
        }
      }

      const items = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
      const status: PurchaseOrderStatus = items.every((item) => item.receivedQuantity >= item.quantity) ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

      const totalReceived = receipts.reduce((sum, r) => sum + r.quantity, 0);
      await tx.inventoryActivity.create({
        data: {
          supplierProductId: po.supplierProductId,
          type: 'po_received',
          message: `Received ${totalReceived} unit${totalReceived === 1 ? '' : 's'} against PO-${String(po.number).padStart(5, '0')}`,
          actorId: actor.id,
          actorName: actor.name,
        },
      });

      const row = await tx.purchaseOrder.update({
        where: { id },
        data: { status, statusUpdatedById: actor.id, statusUpdatedByName: actor.name, statusUpdatedAt: new Date() },
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
    supplierProductId: row.supplierProductId,
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
      unitCost: item.unitCost !== null ? Number(item.unitCost) : null,
    })),
  };
}
