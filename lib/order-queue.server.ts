import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma.server';

// Filters shared by the merged Orders page (queue tabs, print status, picker scope). Each one has a
// Prisma form (for findMany/count) and a SQL form (for the ranked raw-SQL search, alias `o` = Order).

export const QUEUE_KEYS = ['all', 'open', 'slip_not_printed', 'slip_printed', 'not_packed', 'partial', 'packed', 'shipped', 'issues'] as const;
export type OrderQueue = (typeof QUEUE_KEYS)[number];

export function normalizeQueue(value: string | null | undefined): OrderQueue {
  return QUEUE_KEYS.includes(value as OrderQueue) ? (value as OrderQueue) : 'all';
}

/** Pickers never see fulfilled orders or orders placed before this date (as the old Picking List). */
export const PICKER_ORDERED_AT_CUTOFF = new Date('2026-05-01T00:00:00.000Z');

const NO_MATCH = '__none__';

export function pickerScopeWhere(): Prisma.OrderWhereInput[] {
  return [
    { OR: [{ fulfillmentStatus: null }, { fulfillmentStatus: { not: 'fulfilled' } }] },
    { OR: [{ orderedAt: null }, { orderedAt: { gt: PICKER_ORDERED_AT_CUTOFF } }] },
  ];
}

export function pickerScopeSql(): Prisma.Sql[] {
  return [
    Prisma.sql`(o."fulfillmentStatus" IS NULL OR o."fulfillmentStatus" != 'fulfilled')`,
    Prisma.sql`(o."orderedAt" IS NULL OR o."orderedAt" > ${PICKER_ORDERED_AT_CUTOFF})`,
  ];
}

/** `printed` + `not_printed` together means no filter. */
export function normalizePrintStatuses(values: string[]): string[] {
  const set = new Set(values.filter((v) => v === 'printed' || v === 'not_printed'));
  return set.size === 1 ? [...set] : [];
}

export function buildPrintStatusWhere(printStatuses: string[]): Prisma.OrderWhereInput[] {
  if (printStatuses.includes(NO_MATCH)) return [{ id: { in: [] } }];
  const statuses = normalizePrintStatuses(printStatuses);
  if (statuses[0] === 'printed') return [{ pickingSlipPrints: { some: {} } }];
  if (statuses[0] === 'not_printed') return [{ pickingSlipPrints: { none: {} } }];
  return [];
}

export function buildPrintStatusSql(printStatuses: string[]): Prisma.Sql | null {
  if (printStatuses.includes(NO_MATCH)) return Prisma.sql`FALSE`;
  const statuses = normalizePrintStatuses(printStatuses);
  if (statuses[0] === 'printed') return Prisma.sql`EXISTS (SELECT 1 FROM "OrderPickingSlipPrint" p WHERE p."orderId" = o.id)`;
  if (statuses[0] === 'not_printed') return Prisma.sql`NOT EXISTS (SELECT 1 FROM "OrderPickingSlipPrint" p WHERE p."orderId" = o.id)`;
  return null;
}

/** Intersects two optional status lists. `undefined`/empty means "no restriction"; an empty overlap matches nothing. */
export function intersectStatuses(a: string[] | undefined, b: string[] | undefined): string[] {
  if (!a?.length) return b ?? [];
  if (!b?.length) return a;
  const overlap = a.filter((v) => b.includes(v));
  return overlap.length > 0 ? overlap : [NO_MATCH];
}

const fulfilledWhere: Prisma.OrderWhereInput = {
  canceled: false,
  OR: [
    { closed: false, fulfillmentStatus: { in: ['fulfilled', 'shipped'] } },
    { closed: true, fulfillmentStatus: { in: ['fulfilled', 'shipped', 'partially_fulfilled'] } },
  ],
};
const openWhere: Prisma.OrderWhereInput = { canceled: false, closed: false, NOT: fulfilledWhere };

const fulfilledSql = Prisma.sql`(
  o."canceled" = false AND (
    (o."closed" = false AND o."fulfillmentStatus" IN ('fulfilled', 'shipped'))
    OR (o."closed" = true AND o."fulfillmentStatus" IN ('fulfilled', 'shipped', 'partially_fulfilled'))
  )
)`;
const openSql = Prisma.sql`(o."canceled" = false AND o."closed" = false AND NOT ${fulfilledSql})`;

export type QueuePreset = {
  /** Extra packing statuses the tab imposes (ANDed with the toolbar's Packed filter). */
  packing?: string[];
  /** Extra print statuses the tab imposes (ANDed with the toolbar's Print filter). */
  print?: string[];
  prisma: Prisma.OrderWhereInput[];
  sql: Prisma.Sql[];
};

/** What each queue tab means. `all` / `open` add nothing beyond the viewer's own scope. */
export async function resolveQueue(queue: OrderQueue): Promise<QueuePreset> {
  switch (queue) {
    case 'slip_not_printed':
      return { print: ['not_printed'], prisma: [openWhere], sql: [openSql] };
    case 'slip_printed':
      return { print: ['printed'], prisma: [openWhere], sql: [openSql] };
    case 'not_packed':
      return { packing: ['not_packed'], prisma: [openWhere], sql: [openSql] };
    case 'partial':
      return { packing: ['partially_packed'], prisma: [openWhere], sql: [openSql] };
    case 'packed':
      return { packing: ['packed'], prisma: [openWhere], sql: [openSql] };
    case 'shipped':
      return { prisma: [fulfilledWhere], sql: [fulfilledSql] };
    case 'issues': {
      const pending = await prisma.fulfillmentEditRequest.findMany({ where: { status: 'pending' }, select: { orderId: true } });
      const ids = [...new Set(pending.map((r) => r.orderId))];
      return {
        prisma: [{ OR: [{ canceled: true }, { closed: true, NOT: fulfilledWhere }, ...(ids.length > 0 ? [{ id: { in: ids } }] : [])] }],
        sql: [Prisma.sql`(
          o."canceled" = true
          OR (o."closed" = true AND NOT ${fulfilledSql})
          OR EXISTS (SELECT 1 FROM "FulfillmentEditRequest" r WHERE r."orderId" = o.id AND r.status = 'pending')
        )`],
      };
    }
    default:
      return { prisma: [], sql: [] };
  }
}
