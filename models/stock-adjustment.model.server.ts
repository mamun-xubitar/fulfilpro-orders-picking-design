import prisma from '@/lib/prisma.server';
import { recordAdjustmentBatch, type AdjustmentLineInput } from '@/lib/inventory-adjustment.server';
import { Prisma, StockAdjustmentReason, StockAdjustmentSource } from '@prisma/client';

export const ADJUSTMENT_SORT_KEYS = ['number', 'createdAt', 'productName', 'lineCount', 'actorName'] as const;
export type AdjustmentSortKey = (typeof ADJUSTMENT_SORT_KEYS)[number];

/** One adjustment (a saved batch of lines), as listed in the Adjustments tab and a product's history. */
export type AdjustmentBatchRow = {
  id: string;
  number: number;
  source: StockAdjustmentSource;
  reference: string | null;
  createdAt: string;
  supplierProductId: string;
  productName: string;
  itemNo: string;
  actorName: string;
  lineCount: number;
  /** Sum of every line's change. */
  netQty: number;
  /** The reason every line shares, or 'MIXED' when they differ. */
  reason: StockAdjustmentReason | 'MIXED';
};

export type AdjustmentLineRow = {
  id: string;
  variantId: string;
  colour: string;
  size: string;
  sku: string | null;
  delta: number;
  /** Stock on hand just before the change; null for adjustments recorded before batches existed. */
  stockBefore: number | null;
  reason: StockAdjustmentReason;
  note: string | null;
};

export type AdjustmentBatchDetailRow = AdjustmentBatchRow & { lines: AdjustmentLineRow[] };

const summaryInclude = {
  supplierProduct: { select: { name: true, itemNo: true } },
  lines: { select: { delta: true, reason: true } },
} satisfies Prisma.StockAdjustmentBatchInclude;
type BatchWithSummary = Prisma.StockAdjustmentBatchGetPayload<{ include: typeof summaryInclude }>;

function toSummary(row: BatchWithSummary): AdjustmentBatchRow {
  const reasons = new Set(row.lines.map((l) => l.reason));
  return {
    id: row.id,
    number: row.number,
    source: row.source,
    reference: row.reference,
    createdAt: row.createdAt.toISOString(),
    supplierProductId: row.supplierProductId,
    productName: row.supplierProduct.name,
    itemNo: row.supplierProduct.itemNo,
    actorName: row.actorName,
    lineCount: row.lines.length,
    netQty: row.lines.reduce((sum, l) => sum + l.delta, 0),
    reason: reasons.size === 1 ? [...reasons][0] : 'MIXED',
  };
}

export class StockAdjustmentModel {
  /** Every product's adjustments — the Adjustments tab. */
  async listAll(params: {
    search?: string;
    reason?: StockAdjustmentReason;
    dateFrom?: string;
    dateTo?: string;
    sort?: AdjustmentSortKey;
    dir?: 'asc' | 'desc';
    page: number;
    pageSize: number;
  }): Promise<{ adjustments: AdjustmentBatchRow[]; total: number }> {
    const { search, reason, dateFrom, dateTo, sort = 'createdAt', dir = 'desc', page, pageSize } = params;
    const where: Prisma.StockAdjustmentBatchWhereInput = {};
    const and: Prisma.StockAdjustmentBatchWhereInput[] = [];

    if (reason) and.push({ lines: { some: { reason } } });
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
        ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
      };
    }
    const term = search?.trim();
    if (term) {
      const digits = term.replace(/\D/g, '');
      and.push({
        OR: [
          { supplierProduct: { name: { contains: term, mode: 'insensitive' } } },
          { supplierProduct: { itemNo: { contains: term, mode: 'insensitive' } } },
          { actorName: { contains: term, mode: 'insensitive' } },
          { reference: { contains: term, mode: 'insensitive' } },
          { lines: { some: { note: { contains: term, mode: 'insensitive' } } } },
          { lines: { some: { variant: { sku: { contains: term, mode: 'insensitive' } } } } },
          { lines: { some: { variant: { colour: { contains: term, mode: 'insensitive' } } } } },
          { lines: { some: { variant: { size: { contains: term, mode: 'insensitive' } } } } },
          ...(digits ? [{ number: Number(digits) }] : []),
        ],
      });
    }
    if (and.length > 0) where.AND = and;

    const orderBy: Prisma.StockAdjustmentBatchOrderByWithRelationInput[] =
      sort === 'productName'
        ? [{ supplierProduct: { name: dir } }, { number: 'desc' }]
        : sort === 'lineCount'
          ? [{ lines: { _count: dir } }, { number: 'desc' }]
          : [{ [sort]: dir }, { number: 'desc' }];

    const [rows, total] = await Promise.all([
      prisma.stockAdjustmentBatch.findMany({ where, include: summaryInclude, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.stockAdjustmentBatch.count({ where }),
    ]);
    return { adjustments: rows.map(toSummary), total };
  }

  /** A product's latest 50 adjustments — the Adjustments card's "View history". */
  async listForProduct(supplierProductId: string): Promise<AdjustmentBatchRow[]> {
    const rows = await prisma.stockAdjustmentBatch.findMany({
      where: { supplierProductId },
      include: summaryInclude,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map(toSummary);
  }

  /** One adjustment with its lines, for the View modal. */
  async findById(id: string): Promise<AdjustmentBatchDetailRow | null> {
    const row = await prisma.stockAdjustmentBatch.findUnique({
      where: { id },
      include: {
        supplierProduct: { select: { name: true, itemNo: true } },
        lines: {
          select: {
            id: true,
            variantId: true,
            delta: true,
            stockBefore: true,
            reason: true,
            note: true,
            variant: { select: { colour: true, size: true, sku: true, position: true } },
          },
        },
      },
    });
    if (!row) return null;
    const lines = [...row.lines].sort((a, b) => a.variant.position - b.variant.position);
    return {
      ...toSummary(row),
      lines: lines.map((l) => ({
        id: l.id,
        variantId: l.variantId,
        colour: l.variant.colour,
        size: l.variant.size,
        sku: l.variant.sku,
        delta: l.delta,
        stockBefore: l.stockBefore,
        reason: l.reason,
        note: l.note,
      })),
    };
  }

  /** Applies every line and records them as one adjustment, in one transaction — all-or-nothing. */
  async createBatch(args: { supplierProductId: string; lines: AdjustmentLineInput[]; actor: { id: string; name: string } }): Promise<void> {
    await prisma.$transaction((tx) => recordAdjustmentBatch(tx, { ...args, source: 'MANUAL' }));
  }
}
