import prisma from '@/lib/prisma.server';
import { Prisma, PoPaymentStatus } from '@prisma/client';

export type PoPaymentFields = {
  status: PoPaymentStatus;
  currencyCode: string;
  exchangeRate: number;
  buyingPrice: number;
  freight: number;
  misc: number;
  totalAud: number;
  paidAt: string | null;
  reference: string | null;
  remark: string | null;
};

export type PoPaymentHistoryRow = PoPaymentFields & {
  id: string;
  /** created | updated | paid | unpaid */
  action: string;
  actorName: string;
  createdAt: string;
};

export type PoPaymentRow = PoPaymentFields & {
  id: string;
  purchaseOrderId: string;
  updatedByName: string;
  createdAt: string;
  updatedAt: string;
};

/** A payment as listed on the Payments tab: the payment plus the PO it settles. */
export type PoPaymentListRow = PoPaymentRow & {
  purchaseOrder: { number: number; productTitle: string; supplierId: string; supplierName: string; supplierProductId: string };
  historyCount: number;
};

type PaymentRecord = Prisma.PurchaseOrderPaymentGetPayload<object>;

const num = (d: Prisma.Decimal | number) => Number(d);

export function toPoPaymentRow(row: PaymentRecord): PoPaymentRow {
  return {
    id: row.id,
    purchaseOrderId: row.purchaseOrderId,
    status: row.status,
    currencyCode: row.currencyCode,
    exchangeRate: num(row.exchangeRate),
    buyingPrice: num(row.buyingPrice),
    freight: num(row.freight),
    misc: num(row.misc),
    totalAud: num(row.totalAud),
    paidAt: row.paidAt?.toISOString() ?? null,
    reference: row.reference,
    remark: row.remark,
    updatedByName: row.updatedByName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const PAYMENT_SORT_KEYS = ['updatedAt', 'paidAt', 'totalAud', 'status', 'poNumber', 'supplierName', 'productTitle'] as const;
export type PaymentSortKey = (typeof PAYMENT_SORT_KEYS)[number];

export type PaymentListParams = {
  search?: string;
  supplierId?: string;
  status?: PoPaymentStatus;
  dateFrom?: string;
  dateTo?: string;
  sort: PaymentSortKey;
  dir: 'asc' | 'desc';
  page: number;
  pageSize: number;
};

function orderBy(sort: PaymentSortKey, dir: 'asc' | 'desc'): Prisma.PurchaseOrderPaymentOrderByWithRelationInput {
  switch (sort) {
    case 'poNumber':
      return { purchaseOrder: { number: dir } };
    case 'supplierName':
      return { purchaseOrder: { supplierName: dir } };
    case 'productTitle':
      return { purchaseOrder: { productTitle: dir } };
    default:
      return { [sort]: dir };
  }
}

export class PoPaymentModel {
  async findByPurchaseOrderId(purchaseOrderId: string) {
    const row = await prisma.purchaseOrderPayment.findUnique({ where: { purchaseOrderId }, include: { history: { orderBy: { createdAt: 'desc' } } } });
    if (!row) return null;
    return { payment: toPoPaymentRow(row), history: row.history.map(toHistoryRow) };
  }

  /** Creates the PO's payment, or updates it in place — and either way appends one snapshot to its
   * history, in the same transaction. */
  async save(purchaseOrderId: string, fields: Omit<PoPaymentFields, 'paidAt'> & { paidAt: Date | null }, actor: { id: string; name: string }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseOrderPayment.findUnique({ where: { purchaseOrderId } });
      const data = { ...fields };
      const payment = existing
        ? await tx.purchaseOrderPayment.update({ where: { id: existing.id }, data: { ...data, updatedById: actor.id, updatedByName: actor.name } })
        : await tx.purchaseOrderPayment.create({
            data: { ...data, purchaseOrderId, createdById: actor.id, createdByName: actor.name, updatedById: actor.id, updatedByName: actor.name },
          });
      let action = existing ? 'updated' : 'created';
      if (fields.status === 'PAID' && existing?.status !== 'PAID') action = 'paid';
      else if (fields.status === 'UNPAID' && existing?.status === 'PAID') action = 'unpaid';
      await tx.purchaseOrderPaymentHistory.create({
        data: { ...data, paymentId: payment.id, action, actorId: actor.id, actorName: actor.name },
      });
      return toPoPaymentRow(payment);
    });
  }

  async list(params: PaymentListParams) {
    const { search, supplierId, status, dateFrom, dateTo, sort, dir, page, pageSize } = params;
    const where: Prisma.PurchaseOrderPaymentWhereInput = {};
    if (status) where.status = status;
    if (supplierId) where.purchaseOrder = { supplierId };
    if (dateFrom || dateTo) {
      where.updatedAt = {
        ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
        ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
      };
    }
    const term = search?.trim();
    if (term) {
      const digits = term.replace(/\D/g, '');
      where.OR = [
        { reference: { contains: term, mode: 'insensitive' } },
        { remark: { contains: term, mode: 'insensitive' } },
        { purchaseOrder: { productTitle: { contains: term, mode: 'insensitive' } } },
        { purchaseOrder: { supplierName: { contains: term, mode: 'insensitive' } } },
        ...(digits ? [{ purchaseOrder: { number: Number(digits) } }] : []),
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.purchaseOrderPayment.findMany({
        where,
        include: {
          purchaseOrder: { select: { number: true, productTitle: true, supplierId: true, supplierName: true, supplierProductId: true } },
          _count: { select: { history: true } },
        },
        orderBy: orderBy(sort, dir),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.purchaseOrderPayment.count({ where }),
    ]);

    const payments: PoPaymentListRow[] = rows.map((r) => ({ ...toPoPaymentRow(r), purchaseOrder: r.purchaseOrder, historyCount: r._count.history }));
    return { payments, total };
  }

  /** Payments per supplier (a payment belongs to a PO, a PO to a supplier) — the Suppliers tab's count. */
  async countBySupplier(): Promise<Map<string, number>> {
    const rows = await prisma.purchaseOrderPayment.groupBy({ by: ['purchaseOrderId'], _count: { _all: true } });
    if (rows.length === 0) return new Map();
    const pos = await prisma.purchaseOrder.findMany({ where: { id: { in: rows.map((r) => r.purchaseOrderId) } }, select: { supplierId: true } });
    const bySupplier = new Map<string, number>();
    for (const po of pos) bySupplier.set(po.supplierId, (bySupplier.get(po.supplierId) ?? 0) + 1);
    return bySupplier;
  }
}

function toHistoryRow(h: Prisma.PurchaseOrderPaymentHistoryGetPayload<object>): PoPaymentHistoryRow {
  return {
    id: h.id,
    action: h.action,
    status: h.status,
    currencyCode: h.currencyCode,
    exchangeRate: num(h.exchangeRate),
    buyingPrice: num(h.buyingPrice),
    freight: num(h.freight),
    misc: num(h.misc),
    totalAud: num(h.totalAud),
    paidAt: h.paidAt?.toISOString() ?? null,
    reference: h.reference,
    remark: h.remark,
    actorName: h.actorName,
    createdAt: h.createdAt.toISOString(),
  };
}
