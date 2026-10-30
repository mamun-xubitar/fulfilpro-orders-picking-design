import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma.server';
import { sendAppMail } from '@/lib/email.server';
import { OrderModel } from '@/models/order.model.server';
import { resolvePickerRecipientOptions } from '@/lib/email-rules.server';
import { createNotification } from '@/lib/notifications.server';
import { matchesPackingFilter } from '@/lib/late-label-filter.server';

export type PickingLineInput = {
  lineItemId: string;
  quantity: number;
  full: boolean;
};

type Actor = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
} | null;

type NotifyRecipient = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type OrderItem = {
  id: string;
  productId: string | null;
  variantId: string | null;
  name: string;
  title: string;
  variantTitle: string;
  variantOptions: Array<{ name: string; value: string }>;
  imageUrl: string | null;
  sku: string;
  vendor: string;
  qty: number;
  position: number;
};

type ShippingLine = {
  id: string;
  title: string;
  code: string | null;
  source: string | null;
  price: number;
  discountedPrice: number | null;
  currencyCode: string | null;
  carrierIdentifier: string | null;
  requestedFulfillmentServiceId: string | null;
  phone: string | null;
  deliveryCategory: string | null;
  discountCodes: string[];
  discountAllocations: Array<{
    amount: number;
    currencyCode: string | null;
    code: string | null;
    title: string | null;
    type: string | null;
    discountApplicationIndex: number | null;
  }>;
};

export class PickingListModel {
  private readonly orderModel = new OrderModel();

  async list(params: {
    search?: string;
    searchField?: string;
    storeIds?: string[];
    period?: 'all' | 'week' | 'month' | 'year';
    dateFrom?: string;
    dateTo?: string;
    packedStatuses?: string[];
    printStatuses?: string[];
    page: number;
    pageSize: number;
    allowedStoreIds?: string[] | null;
  }) {
    const where = buildOrderWhere(params);
    const orderedAtBounds = getOrderedAtBounds(params);
    const searchTokens = (params.search?.trim() ?? '').split(/\s+/).filter(Boolean);
    const packedStatuses = new Set(params.packedStatuses ?? []);
    const filterByPacking = packedStatuses.size > 0;

    const storeWhere: Prisma.StoreWhereInput = { status: 'connected' };
    if (params.allowedStoreIds !== null && params.allowedStoreIds !== undefined) {
      storeWhere.id = { in: params.allowedStoreIds };
    }

    const [ordersResult, stores] = await Promise.all([
      this.listOrderRows({
        where,
        storeIds: params.storeIds ?? [],
        searchTokens,
        searchField: params.searchField,
        printStatuses: params.printStatuses ?? [],
        filterByPacking,
        orderedAtFrom: orderedAtBounds.from,
        orderedAtTo: orderedAtBounds.to,
        page: params.page,
        pageSize: params.pageSize,
      }),
      prisma.store.findMany({
        where: storeWhere,
        select: { id: true, name: true, storeDomain: true },
        orderBy: [{ name: 'asc' }, { storeDomain: 'asc' }],
      }),
    ]);

    const messageCounts = await getPickingMessageCounts(ordersResult.rows.map((row) => row.id));
    const rows = ordersResult.rows.map((row) => toPickingOrderRow(row, messageCounts.get(row.id) ?? 0));
    const filtered = rows.filter((row) => {
      if (packedStatuses.size > 0 && !matchesPackingFilter(packedStatuses, row)) return false;
      return true;
    });

    const total = filterByPacking ? filtered.length : ordersResult.total;
    const start = (params.page - 1) * params.pageSize;
    const pageRows = filterByPacking ? filtered.slice(start, start + params.pageSize) : filtered;
    // const rowsWithMetadata = await this.attachMetadata(pageRows);

    return {
      orders: pageRows,
      stores: stores.map((store) => ({
        id: store.id,
        name: store.name ?? store.storeDomain,
        storeDomain: store.storeDomain,
      })),
      total,
    };
  }

  private async listOrderRows(params: {
    where: Prisma.OrderWhereInput;
    storeIds: string[];
    searchTokens: string[];
    searchField?: string;
    printStatuses: string[];
    filterByPacking: boolean;
    orderedAtFrom?: Date;
    orderedAtTo?: Date;
    page: number;
    pageSize: number;
  }) {
    const include = pickingOrderInclude();

    if (params.searchTokens.length > 0 && !params.filterByPacking) {
      const searchPage = await getRankedPickingOrderSearchPage({
        tokens: params.searchTokens,
        searchField: params.searchField,
        storeIds: params.storeIds,
        printStatuses: params.printStatuses,
        orderedAtFrom: params.orderedAtFrom,
        orderedAtTo: params.orderedAtTo,
        page: params.page,
        pageSize: params.pageSize,
      });
      const rows = searchPage.ids.length > 0
        ? await prisma.order.findMany({
          where: { id: { in: searchPage.ids } },
          include,
        })
        : [];
      const idOrder = new Map(searchPage.ids.map((id, index) => [id, index]));
      rows.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));
      return { rows, total: searchPage.total };
    }

    if (!params.filterByPacking) {
      const [total, rows] = await Promise.all([
        prisma.order.count({ where: params.where }),
        prisma.order.findMany({
          where: params.where,
          include,
          orderBy: { orderedAt: 'desc' },
          skip: (params.page - 1) * params.pageSize,
          take: params.pageSize,
        }),
      ]);
      return { rows, total };
    }

    if (params.searchTokens.length > 0) {
      const searchPage = await getRankedPickingOrderSearchPage({
        tokens: params.searchTokens,
        searchField: params.searchField,
        storeIds: params.storeIds,
        printStatuses: params.printStatuses,
        orderedAtFrom: params.orderedAtFrom,
        orderedAtTo: params.orderedAtTo,
        page: 1,
        pageSize: 10000,
      });
      const rows = searchPage.ids.length > 0
        ? await prisma.order.findMany({
          where: { id: { in: searchPage.ids } },
          include,
        })
        : [];
      const idOrder = new Map(searchPage.ids.map((id, index) => [id, index]));
      rows.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));
      return { rows, total: searchPage.total };
    }

    const rows = await prisma.order.findMany({
      where: params.where,
      include,
      orderBy: { orderedAt: 'desc' },
    });
    return { rows, total: rows.length };
  }

  async listRecipientOptions() {
    const [packingOptions, messageOptions] = await Promise.all([
      resolvePickerRecipientOptions('picking_packing'),
      resolvePickerRecipientOptions('direct_message'),
    ]);

    return {
      packingRecipients: packingOptions.allowedUsers,
      packingDefaultRecipientUserIds: packingOptions.defaultUserIds,
      messageRecipients: messageOptions.allowedUsers,
      messageDefaultRecipientUserIds: messageOptions.defaultUserIds,
    };
  }

  async refreshFromShopify(orderId: string) {
    await this.orderModel.refreshFromShopify(orderId);
    const result = await this.getPackingSummary(orderId);
    return result.order;
  }

  async confirmPacked(params: {
    orderId: string;
    lines: PickingLineInput[];
    notifyUserIds: string[];
    notifyMessage: string;
    actor: Actor;
    originUrl?: string;
  }) {
    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
      include: {
        store: { select: { name: true, storeDomain: true } },
        packingConfirmations: true,
      },
    });

    if (!order) throw new Error('Order not found');
    if (order.canceled) throw new Error('Canceled orders cannot be packed');
    if (order.closed) throw new Error('Closed orders cannot be packed');

    const items = toLineItems(order.lineItems);
    const normalizedLines = normalizePackingLines(params.lines, items, order.packingConfirmations);
    if (normalizedLines.length === 0) throw new Error('Select at least one item quantity to pack');

    const recipientOptions = await resolvePickerRecipientOptions('picking_packing');
    const recipients = toConfiguredRecipients(params.notifyUserIds, recipientOptions.allowedUsers);
    const saved = await prisma.orderPackingConfirmation.create({
      data: {
        orderId: order.id,
        orderNumber: String(order.number),
        lines: normalizedLines as Prisma.InputJsonValue,
        notifyRecipients: recipients as Prisma.InputJsonValue,
        notifyMessage: params.notifyMessage || null,
        pickerId: params.actor?.id ?? null,
        pickerName: params.actor?.name ?? null,
        pickerEmail: params.actor?.email ?? null,
      },
    });

    if (recipients.length > 0) {
      await sendPackingEmail({
        type: 'confirmed',
        order,
        lines: normalizedLines,
        items,
        recipients,
        message: params.notifyMessage,
        actor: params.actor,
        originUrl: params.originUrl,
      });
    }

    return this.getPackingSummary(order.id, saved.id);
  }

  async cancelPacked(params: {
    orderId: string;
    confirmationId: string;
    notifyUserIds: string[];
    notifyMessage: string;
    actor: Actor;
    originUrl?: string;
  }) {
    const confirmation = await prisma.orderPackingConfirmation.findFirst({
      where: { id: params.confirmationId, orderId: params.orderId },
      include: {
        order: {
          include: {
            store: { select: { name: true, storeDomain: true } },
          },
        },
      },
    });

    if (!confirmation) throw new Error('Packing confirmation not found');
    if (confirmation.canceledAt) throw new Error('Packing confirmation is already canceled');

    const recipientOptions = await resolvePickerRecipientOptions('picking_packing');
    const recipients = toConfiguredRecipients(params.notifyUserIds, recipientOptions.allowedUsers);
    await prisma.orderPackingConfirmation.update({
      where: { id: confirmation.id },
      data: {
        canceledAt: new Date(),
        canceledById: params.actor?.id ?? null,
        canceledByName: params.actor?.name ?? null,
        canceledByEmail: params.actor?.email ?? null,
        cancelNotifyRecipients: recipients as Prisma.InputJsonValue,
        cancelNotifyMessage: params.notifyMessage || null,
      },
    });

    if (recipients.length > 0) {
      await sendPackingEmail({
        type: 'canceled',
        order: confirmation.order,
        lines: normalizeStoredLines(confirmation.lines),
        items: toLineItems(confirmation.order.lineItems),
        recipients,
        message: params.notifyMessage,
        actor: params.actor,
        originUrl: params.originUrl,
      });
    }

    return this.getPackingSummary(params.orderId);
  }

  async recordPrints(params: {
    orders: Array<{ orderId: string; items: unknown[] }>;
    actor: Actor;
  }) {
    if (params.orders.length === 0) throw new Error('Select at least one order to print');

    const orderIds = params.orders.map((order) => order.orderId);
    const existing = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, number: true },
    });
    const orderNumberById = new Map(existing.map((order) => [order.id, order.number]));

    await prisma.orderPickingSlipPrint.createMany({
      data: params.orders.map((order) => ({
        orderId: order.orderId,
        orderNumber: String(orderNumberById.get(order.orderId) ?? ''),
        items: order.items as Prisma.InputJsonValue,
        pickerId: params.actor?.id ?? null,
        pickerName: params.actor?.name ?? null,
        pickerEmail: params.actor?.email ?? null,
      })),
    });

    return { printedOrderIds: orderIds };
  }

  private async getPackingSummary(orderId: string, savedConfirmationId?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: { select: { id: true, name: true, storeDomain: true } },
        packingConfirmations: { orderBy: { confirmedAt: 'desc' } },
        pickingSlipPrints: { orderBy: { printedAt: 'desc' }, take: 1 },
        _count: { select: { notes: true } },
      },
    });

    if (!order) throw new Error('Order not found');
    // const [row] = await this.attachMetadata([toPickingOrderRow(order)]);
    const messageCount = await prisma.orderMessage.count({
      where: { orderId: order.id, type: 'picker' },
    });
    return { order: toPickingOrderRow(order, messageCount), savedConfirmationId };
  }

  private async attachMetadata<T extends { storeId: string; items: Array<OrderItem & { metadata: PickingMetadata }> }>(rows: T[]) {
    const metadataRows = await loadPickingMetadataRows(rows);

    return rows.map((row) => ({
      ...row,
      items: row.items.map((item) => ({
        ...item,
        metadata: findBestMetadata(row.storeId, item, metadataRows),
      })),
    }));
  }
}

type PickingMetadata = { location: string; remark: string; note: string };

const PICKING_LIST_ORDERED_AT_CUTOFF = new Date('2026-05-01T00:00:00.000Z');

function buildOrderWhere(params: {
  storeIds?: string[];
  period?: 'all' | 'week' | 'month' | 'year';
  dateFrom?: string;
  dateTo?: string;
  printStatuses?: string[];
}) {
  const printStatusConditions = buildPrintStatusWhereConditions(params.printStatuses ?? []);
  const andConditions: Prisma.OrderWhereInput[] = [
    {
      OR: [
        { orderedAt: null },
        { orderedAt: { gt: PICKING_LIST_ORDERED_AT_CUTOFF } },
      ],
    },
  ];

  if (printStatusConditions.length > 0) {
    andConditions.push({ OR: printStatusConditions });
  }

  const where: Prisma.OrderWhereInput = {
    store: {
      is: {
        status: 'connected',
        ...(params.storeIds && params.storeIds.length > 0 ? { id: { in: params.storeIds } } : {}),
      },
    },
    fulfillmentStatus: { not: 'fulfilled' },
    AND: andConditions,
  };

  if (params.dateFrom || params.dateTo) {
    where.orderedAt = {
      ...(params.dateFrom ? { gte: new Date(`${params.dateFrom}T00:00:00.000Z`) } : {}),
      ...(params.dateTo ? { lte: new Date(`${params.dateTo}T23:59:59.999Z`) } : {}),
    };
  } else {
    const start = getPeriodStartDate(params.period ?? 'all');
    if (start) where.orderedAt = { gte: start };
  }

  return where;
}

function getOrderedAtBounds(params: {
  period?: 'all' | 'week' | 'month' | 'year';
  dateFrom?: string;
  dateTo?: string;
}) {
  if (params.dateFrom || params.dateTo) {
    return {
      from: params.dateFrom ? new Date(`${params.dateFrom}T00:00:00.000Z`) : undefined,
      to: params.dateTo ? new Date(`${params.dateTo}T23:59:59.999Z`) : undefined,
    };
  }

  return { from: getPeriodStartDate(params.period ?? 'all') ?? undefined, to: undefined };
}

function pickingOrderInclude() {
  return {
    store: { select: { id: true, name: true, storeDomain: true } },
    packingConfirmations: { orderBy: { confirmedAt: 'desc' as const } },
    pickingSlipPrints: { orderBy: { printedAt: 'desc' as const }, take: 1 },
    _count: { select: { notes: true } },
  } satisfies Prisma.OrderInclude;
}

function buildPrintStatusWhereConditions(printStatuses: string[]) {
  const statuses = new Set(printStatuses);
  const conditions: Prisma.OrderWhereInput[] = [];
  if (statuses.has('printed')) conditions.push({ pickingSlipPrints: { some: {} } });
  if (statuses.has('not_printed')) conditions.push({ pickingSlipPrints: { none: {} } });
  return conditions.length === 2 ? [] : conditions;
}

async function loadPickingMetadataRows(rows: Array<{ storeId: string; items: OrderItem[] }>) {
  const storeIds = new Set<string>();
  const productIds = new Set<string>();
  const variantIds = new Set<string>();
  const skus = new Set<string>();

  for (const row of rows) {
    storeIds.add(row.storeId);
    for (const item of row.items) {
      if (item.productId) productIds.add(item.productId);
      if (item.variantId) variantIds.add(item.variantId);
      if (item.sku) skus.add(item.sku);
    }
  }

  if (
    storeIds.size === 0 ||
    (productIds.size === 0 && variantIds.size === 0 && skus.size === 0)
  ) {
    return [];
  }

  const identifierConditions: Prisma.OrderItemPickingMetadataWhereInput[] = [];
  if (variantIds.size > 0) identifierConditions.push({ variantId: { in: [...variantIds] } });
  if (productIds.size > 0) identifierConditions.push({ productId: { in: [...productIds] } });
  if (skus.size > 0) identifierConditions.push({ sku: { in: [...skus] } });

  return prisma.orderItemPickingMetadata.findMany({
    where: {
      storeId: { in: [...storeIds] },
      OR: identifierConditions,
    },
  });
}

async function getRankedPickingOrderSearchPage(params: {
  tokens: string[];
  searchField?: string;
  storeIds: string[];
  printStatuses: string[];
  orderedAtFrom?: Date;
  orderedAtTo?: Date;
  page: number;
  pageSize: number;
}) {
  const whereSql = buildRankedPickingOrderSearchWhereSql(params);
  const rankSql = buildPickingOrderSearchRankSql(params.tokens);
  const skip = (params.page - 1) * params.pageSize;
  const rows = await prisma.$queryRaw<{ total: number; ids: string[] }[]>(Prisma.sql`
    WITH filtered AS (
      SELECT
        o.id,
        o."orderedAt",
        o."createdAt",
        ${rankSql} AS "searchRank"
      FROM "Order" o
      INNER JOIN "Store" s ON s.id = o."storeId"
      WHERE ${whereSql}
    ),
    paged AS (
      SELECT id, "searchRank", "orderedAt", "createdAt"
      FROM filtered
      ORDER BY "searchRank" ASC, "orderedAt" DESC NULLS LAST, "createdAt" DESC, id ASC
      OFFSET ${skip}
      LIMIT ${params.pageSize}
    )
    SELECT
      (SELECT COUNT(*)::integer FROM filtered) AS total,
      COALESCE(
        array_agg(paged.id ORDER BY paged."searchRank" ASC, paged."orderedAt" DESC NULLS LAST, paged."createdAt" DESC, paged.id ASC)
          FILTER (WHERE paged.id IS NOT NULL),
        ARRAY[]::text[]
      ) AS ids
    FROM paged
  `);

  const row = rows[0];
  return {
    total: row?.total ?? 0,
    ids: row?.ids ?? [],
  };
}

function buildRankedPickingOrderSearchWhereSql(params: {
  tokens: string[];
  searchField?: string;
  storeIds: string[];
  printStatuses: string[];
  orderedAtFrom?: Date;
  orderedAtTo?: Date;
}) {
  const whereParts: Prisma.Sql[] = [
    Prisma.sql`s.status = 'connected'`,
    Prisma.sql`(o."fulfillmentStatus" IS NULL OR o."fulfillmentStatus" != 'fulfilled')`,
    Prisma.sql`(o."orderedAt" IS NULL OR o."orderedAt" > ${PICKING_LIST_ORDERED_AT_CUTOFF})`,
  ];

  if (params.storeIds.length > 0) {
    whereParts.push(Prisma.sql`s.id IN (${Prisma.join(params.storeIds)})`);
  }

  if (params.orderedAtFrom) {
    whereParts.push(Prisma.sql`o."orderedAt" >= ${params.orderedAtFrom}`);
  }

  if (params.orderedAtTo) {
    whereParts.push(Prisma.sql`o."orderedAt" <= ${params.orderedAtTo}`);
  }

  const printStatusSql = buildPrintStatusFilterSql(params.printStatuses);
  if (printStatusSql) {
    whereParts.push(printStatusSql);
  }

  whereParts.push(buildPickingTokenSearchSql(params.tokens, params.searchField));

  return Prisma.join(whereParts, ' AND ');
}

function buildPickingTokenSearchSql(tokens: string[], searchField?: string) {
  const tokenConditions = tokens.map((token) => {
    const conditions = buildPickingFieldConditionsForToken(token, searchField);
    return Prisma.sql`(${Prisma.join(conditions, ' OR ')})`;
  });

  return Prisma.sql`(${Prisma.join(tokenConditions, ' AND ')})`;
}

function buildPickingFieldConditionsForToken(token: string, searchField?: string): Prisma.Sql[] {
  switch (searchField) {
    case 'number':
      return [ilikeContains(Prisma.sql`o."number"::text`, token)];
    case 'customer':
      return [ilikeContains(Prisma.sql`o."cusName"`, token)];
    case 'address':
      return [
        ilikeContains(Prisma.sql`o."address"`, token),
        ilikeContains(Prisma.sql`o."address2"`, token),
        ilikeContains(Prisma.sql`o."city"`, token),
        ilikeContains(Prisma.sql`o."state"`, token),
        ilikeContains(Prisma.sql`o."country"`, token),
      ];
    case 'lineItem':
      return [ilikeContains(Prisma.sql`o."lineItems"::text`, token)];
    case 'barcode':
      return [ilikeContains(Prisma.sql`o."boarcode"`, token)];
    default:
      return [
        ilikeContains(Prisma.sql`o."number"::text`, token),
        ilikeContains(Prisma.sql`o."cusName"`, token),
        ilikeContains(Prisma.sql`o."cusEmail"`, token),
        ilikeContains(Prisma.sql`o."boarcode"`, token),
        ilikeContains(Prisma.sql`o."address"`, token),
        ilikeContains(Prisma.sql`o."address2"`, token),
        ilikeContains(Prisma.sql`o."city"`, token),
        ilikeContains(Prisma.sql`o."state"`, token),
        ilikeContains(Prisma.sql`o."zip"`, token),
        ilikeContains(Prisma.sql`o."country"`, token),
        ilikeContains(Prisma.sql`s.name`, token),
        ilikeContains(Prisma.sql`s."storeDomain"`, token),
        ilikeContains(Prisma.sql`o."lineItems"::text`, token),
      ];
  }
}

function buildPickingOrderSearchRankSql(tokens: string[]) {
  const terms = uniqueSearchTerms(tokens);
  return Prisma.sql`CASE
    WHEN ${anyTerm(terms, (term) => Prisma.sql`o."number"::text = ${term}`)} THEN 0
    WHEN ${anyTerm(terms, (term) => ilikeStartsWith(Prisma.sql`o."number"::text`, term))} THEN 1
    WHEN ${anyTerm(terms, (term) => ilikeExact(Prisma.sql`o."boarcode"`, term))} THEN 2
    WHEN ${anyTerm(terms, (term) => ilikeStartsWith(Prisma.sql`o."boarcode"`, term))} THEN 3
    WHEN ${anyTerm(terms, (term) => ilikeContains(Prisma.sql`o."number"::text`, term))} THEN 4
    WHEN ${anyTerm(terms, (term) => ilikeContains(Prisma.sql`o."boarcode"`, term))} THEN 5
    WHEN ${anyTerm(terms, (term) => Prisma.sql`(${ilikeExact(Prisma.sql`o."cusName"`, term)} OR ${ilikeExact(Prisma.sql`o."cusEmail"`, term)})`)} THEN 6
    WHEN ${anyTerm(terms, (term) => Prisma.sql`(${ilikeStartsWith(Prisma.sql`o."cusName"`, term)} OR ${ilikeStartsWith(Prisma.sql`o."cusEmail"`, term)})`)} THEN 7
    WHEN ${anyTerm(terms, (term) => Prisma.sql`(${ilikeContains(Prisma.sql`o."cusName"`, term)} OR ${ilikeContains(Prisma.sql`o."cusEmail"`, term)})`)} THEN 8
    WHEN ${anyTerm(terms, (term) => Prisma.sql`(${ilikeStartsWith(Prisma.sql`s.name`, term)} OR ${ilikeStartsWith(Prisma.sql`s."storeDomain"`, term)})`)} THEN 9
    WHEN ${anyTerm(terms, (term) => Prisma.sql`(${ilikeContains(Prisma.sql`s.name`, term)} OR ${ilikeContains(Prisma.sql`s."storeDomain"`, term)})`)} THEN 10
    WHEN ${anyTerm(terms, (term) => Prisma.sql`(
      ${ilikeContains(Prisma.sql`o."address"`, term)}
      OR ${ilikeContains(Prisma.sql`o."address2"`, term)}
      OR ${ilikeContains(Prisma.sql`o."city"`, term)}
      OR ${ilikeContains(Prisma.sql`o."state"`, term)}
      OR ${ilikeContains(Prisma.sql`o."country"`, term)}
    )`)} THEN 11
    WHEN ${anyTerm(terms, (term) => ilikeContains(Prisma.sql`o."lineItems"::text`, term))} THEN 12
    ELSE 20
  END`;
}

function buildPrintStatusFilterSql(printStatuses: string[]) {
  const statuses = new Set(printStatuses);
  const conditions: Prisma.Sql[] = [];
  if (statuses.has('printed')) conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM "OrderPickingSlipPrint" p WHERE p."orderId" = o.id)`);
  if (statuses.has('not_printed')) conditions.push(Prisma.sql`NOT EXISTS (SELECT 1 FROM "OrderPickingSlipPrint" p WHERE p."orderId" = o.id)`);
  return conditions.length === 0 || conditions.length === 2 ? null : Prisma.sql`(${Prisma.join(conditions, ' OR ')})`;
}

function anyTerm(terms: string[], build: (term: string) => Prisma.Sql) {
  return Prisma.sql`(${Prisma.join(terms.map(build), ' OR ')})`;
}

function ilikeExact(field: Prisma.Sql, value: string) {
  return Prisma.sql`LOWER(COALESCE(${field}, '')) = LOWER(${value})`;
}

function ilikeStartsWith(field: Prisma.Sql, value: string) {
  return Prisma.sql`COALESCE(${field}, '') ILIKE ${buildLikePattern(value, 'startsWith')} ESCAPE '\\'`;
}

function ilikeContains(field: Prisma.Sql, value: string) {
  return Prisma.sql`COALESCE(${field}, '') ILIKE ${buildLikePattern(value, 'contains')} ESCAPE '\\'`;
}

function buildLikePattern(value: string, mode: 'startsWith' | 'contains') {
  const escaped = value.replace(/[\\%_]/g, (char) => `\\${char}`);
  return mode === 'startsWith' ? `${escaped}%` : `%${escaped}%`;
}

function toPickingOrderRow(order: {
  id: string;
  number: number;
  boarcode: string | null;
  cusName: string;
  cusEmail: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  phone: string | null;
  note: string | null;
  canceled: boolean;
  closed: boolean;
  orderedAt: Date | null;
  labelPrintedAt: Date | null;
  lineItems: Prisma.JsonValue;
  shippingLines: Prisma.JsonValue | null;
  fulfillmentStatus: string | null;
  fulfillmentItems: Prisma.JsonValue | null;
  store: { id: string; name: string | null; storeDomain: string };
  packingConfirmations: Array<{ id: string; lines: Prisma.JsonValue; confirmedAt: Date; canceledAt: Date | null }>;
  pickingSlipPrints: Array<{ printedAt: Date }>;
  _count: { notes: number };
}, messageCount: number) {
  const items = toLineItems(order.lineItems)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((item) => ({ ...item, metadata: { location: '', remark: '', note: '' } }));
  const activeConfirmations = order.packingConfirmations.filter((confirmation) => !confirmation.canceledAt);
  const packedByLine = getPackedByLine(activeConfirmations);
  const fulfilledByLine = getFulfilledByLine(order.fulfillmentItems);
  const totalQuantity = items.reduce((sum, item) => sum + Math.max(0, item.qty), 0);
  const packedQuantity = [...packedByLine.values()].reduce((sum, qty) => sum + qty, 0);
  const lastPackedAt = activeConfirmations[0]?.confirmedAt?.toISOString() ?? null;
  const lastPackingUpdateAt = order.packingConfirmations[0]?.confirmedAt?.toISOString() ?? null;
  const packingStatus = packedQuantity >= totalQuantity && totalQuantity > 0
    ? 'packed'
    : packedQuantity > 0
      ? 'partially_packed'
      : 'not_packed';

  return {
    id: order.id,
    number: order.number,
    barcode: order.boarcode,
    customer: order.cusName,
    customerEmail: order.cusEmail,
    phone: order.phone,
    address: order.address,
    address2: order.address2,
    city: order.city,
    state: order.state,
    zip: order.zip,
    country: order.country,
    note: order.note,
    canceled: order.canceled,
    closed: order.closed,
    orderedAt: order.orderedAt?.toISOString() ?? '',
    labelPrintedAt: order.labelPrintedAt?.toISOString() ?? null,
    storeId: order.store.id,
    storeName: order.store.name ?? order.store.storeDomain,
    storeDomain: order.store.storeDomain,
    shippingLines: toShippingLines(order.shippingLines),
    items: items.map((item) => ({
      ...item,
      packedQuantity: packedByLine.get(item.id) ?? 0,
      packedDate: getLinePackedDate(activeConfirmations, item.id),
      lastPackedUpdate: getLinePackedDate(order.packingConfirmations, item.id),
      fulfilledQuantity: fulfilledByLine.get(item.id) ?? 0,
    })),
    vendors: Array.from(new Set(items.map((item) => item.vendor).filter(Boolean))),
    printed: order.pickingSlipPrints.length > 0,
    lastPrintedAt: order.pickingSlipPrints[0]?.printedAt.toISOString() ?? null,
    packingStatus,
    packedQuantity,
    totalQuantity,
    lastPackedAt,
    lastPackingUpdateAt,
    noteCount: order._count.notes,
    messageCount,
    fulfillmentStatus: order.fulfillmentStatus ?? null,
    packingConfirmations: order.packingConfirmations.map((confirmation) => ({
      id: confirmation.id,
      confirmedAt: confirmation.confirmedAt.toISOString(),
      canceledAt: confirmation.canceledAt?.toISOString() ?? null,
      lines: normalizeStoredLines(confirmation.lines),
    })),
  };
}

async function getPickingMessageCounts(orderIds: string[]) {
  if (orderIds.length === 0) return new Map<string, number>();

  const rows = await prisma.orderMessage.groupBy({
    by: ['orderId'],
    where: {
      orderId: { in: orderIds },
      type: 'picker',
    },
    _count: { _all: true },
  });

  return new Map(rows.map((row) => [row.orderId, row._count._all]));
}

function toLineItems(value: Prisma.JsonValue): OrderItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const obj = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return {
      id: typeof obj.id === 'string' ? obj.id : String(obj.id ?? ''),
      productId: typeof obj.productId === 'string' ? obj.productId : (obj.productId ? String(obj.productId) : null),
      variantId: typeof obj.variantId === 'string' ? obj.variantId : (obj.variantId ? String(obj.variantId) : null),
      name: typeof obj.name === 'string' ? obj.name : '',
      title: typeof obj.title === 'string' ? obj.title : (typeof obj.name === 'string' ? obj.name : ''),
      variantTitle: typeof obj.variantTitle === 'string' ? obj.variantTitle : '',
      variantOptions: normalizeVariantOptions(obj.variantOptions),
      imageUrl: typeof obj.imageUrl === 'string' && obj.imageUrl.trim() ? obj.imageUrl : null,
      sku: typeof obj.sku === 'string' ? obj.sku : '',
      vendor: typeof obj.vendor === 'string' ? obj.vendor : '',
      qty: typeof obj.qty === 'number' ? obj.qty : Number(obj.qty ?? 0),
      position: typeof obj.position === 'number' ? obj.position : index,
    };
  });
}

function toShippingLines(value: Prisma.JsonValue | null): ShippingLine[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const obj = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const priceSet = obj.price_set as { shop_money?: { amount?: unknown; currency_code?: unknown } } | undefined;
    const discountedPriceSet = obj.discounted_price_set as { shop_money?: { amount?: unknown; currency_code?: unknown } } | undefined;
    const price = obj.price ?? priceSet?.shop_money?.amount ?? 0;
    const discountedPrice = obj.discountedPrice ?? obj.discounted_price ?? discountedPriceSet?.shop_money?.amount ?? null;
    const currencyCode = obj.currencyCode ?? priceSet?.shop_money?.currency_code ?? discountedPriceSet?.shop_money?.currency_code ?? null;
    const discountAllocations = normalizeShippingDiscountAllocations(obj.discountAllocations ?? obj.discount_allocations);
    const discountCodes = normalizeStringArray(obj.discountCodes).concat(
      discountAllocations
        .map((allocation) => allocation.code)
        .filter((code): code is string => Boolean(code))
    );

    return {
      id: typeof obj.id === 'string' ? obj.id : String(obj.id ?? ''),
      title: typeof obj.title === 'string' ? obj.title : '',
      code: typeof obj.code === 'string' ? obj.code : null,
      source: typeof obj.source === 'string' ? obj.source : null,
      price: toJsonNumber(price, 0),
      discountedPrice: discountedPrice === null ? null : toJsonNumber(discountedPrice, 0),
      currencyCode: typeof currencyCode === 'string' ? currencyCode : null,
      carrierIdentifier: typeof obj.carrierIdentifier === 'string'
        ? obj.carrierIdentifier
        : (typeof obj.carrier_identifier === 'string' ? obj.carrier_identifier : null),
      requestedFulfillmentServiceId: obj.requestedFulfillmentServiceId
        ? String(obj.requestedFulfillmentServiceId)
        : (obj.requested_fulfillment_service_id ? String(obj.requested_fulfillment_service_id) : null),
      phone: typeof obj.phone === 'string' ? obj.phone : null,
      deliveryCategory: typeof obj.deliveryCategory === 'string'
        ? obj.deliveryCategory
        : (typeof obj.delivery_category === 'string' ? obj.delivery_category : null),
      discountCodes: Array.from(new Set(discountCodes)),
      discountAllocations,
    };
  });
}

function normalizeShippingDiscountAllocations(value: unknown): ShippingLine['discountAllocations'] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const obj = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const amountSet = obj.amount_set as { shop_money?: { amount?: unknown; currency_code?: unknown } } | undefined;
    const amount = obj.amount ?? amountSet?.shop_money?.amount ?? 0;
    const currencyCode = obj.currencyCode ?? amountSet?.shop_money?.currency_code ?? null;
    const discountApplicationIndex = obj.discountApplicationIndex ?? obj.discount_application_index ?? null;
    return {
      amount: toJsonNumber(amount, 0),
      currencyCode: typeof currencyCode === 'string' ? currencyCode : null,
      code: typeof obj.code === 'string' ? obj.code : null,
      title: typeof obj.title === 'string' ? obj.title : null,
      type: typeof obj.type === 'string' ? obj.type : null,
      discountApplicationIndex: discountApplicationIndex === null ? null : toJsonNumber(discountApplicationIndex, 0),
    };
  });
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => typeof item === 'string' ? item.trim() : '')
    .filter(Boolean);
}

function toJsonNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeVariantOptions(value: unknown): Array<{ name: string; value: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((option) => {
      if (!option || typeof option !== 'object') return null;
      const obj = option as Record<string, unknown>;
      const name = typeof obj.name === 'string' ? obj.name.trim() : '';
      const optionValue = typeof obj.value === 'string' ? obj.value.trim() : '';
      return name && optionValue ? { name, value: optionValue } : null;
    })
    .filter((option): option is { name: string; value: string } => Boolean(option));
}

function normalizeStoredLines(value: Prisma.JsonValue): PickingLineInput[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((line) => {
      if (!line || typeof line !== 'object') return null;
      const obj = line as Record<string, unknown>;
      const lineItemId = typeof obj.lineItemId === 'string' ? obj.lineItemId : '';
      const quantity = typeof obj.quantity === 'number' ? obj.quantity : Number(obj.quantity ?? 0);
      const full = Boolean(obj.full);
      return lineItemId && quantity > 0 ? { lineItemId, quantity, full } : null;
    })
    .filter((line): line is PickingLineInput => Boolean(line));
}

function normalizePackingLines(
  lines: PickingLineInput[],
  items: OrderItem[],
  confirmations: Array<{ lines: Prisma.JsonValue; canceledAt: Date | null }>
) {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const packedByLine = getPackedByLine(confirmations.filter((confirmation) => !confirmation.canceledAt));
  return lines
    .map((line) => {
      const item = itemById.get(line.lineItemId);
      if (!item) return null;
      const alreadyPacked = packedByLine.get(item.id) ?? 0;
      const remaining = Math.max(0, item.qty - alreadyPacked);
      const requestedQuantity = Number.isFinite(line.quantity) ? Math.floor(line.quantity) : 0;
      const quantity = Math.min(remaining, Math.max(0, requestedQuantity));
      if (quantity < 1) return null;
      return { lineItemId: item.id, quantity, full: Boolean(line.full) || quantity === remaining };
    })
    .filter((line): line is PickingLineInput => Boolean(line));
}

function getPackedByLine(confirmations: Array<{ lines: Prisma.JsonValue }>) {
  const packed = new Map<string, number>();
  confirmations.forEach((confirmation) => {
    normalizeStoredLines(confirmation.lines).forEach((line) => {
      packed.set(line.lineItemId, (packed.get(line.lineItemId) ?? 0) + line.quantity);
    });
  });
  return packed;
}

function getFulfilledByLine(fulfillmentItems: Prisma.JsonValue | null) {
  const fulfilled = new Map<string, number>();
  if (!Array.isArray(fulfillmentItems)) return fulfilled;
  fulfillmentItems.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const obj = item as Record<string, unknown>;
    const lineItemId = typeof obj.lineItemId === 'string' ? obj.lineItemId : '';
    const quantity = typeof obj.quantity === 'number' ? obj.quantity : Number(obj.quantity ?? 0);
    if (lineItemId && quantity > 0) {
      fulfilled.set(lineItemId, (fulfilled.get(lineItemId) ?? 0) + quantity);
    }
  });
  return fulfilled;
}

function getLinePackedDate(confirmations: Array<{ lines: Prisma.JsonValue; confirmedAt: Date }>, lineItemId: string) {
  const match = confirmations.find((confirmation) => normalizeStoredLines(confirmation.lines).some((line) => line.lineItemId === lineItemId));
  return match?.confirmedAt.toISOString() ?? null;
}

function findBestMetadata(storeId: string, item: OrderItem, rows: Array<{
  storeId: string;
  productId: string | null;
  variantId: string | null;
  sku: string | null;
  location: string | null;
  remark: string | null;
  note: string | null;
}>): PickingMetadata {
  const match = rows.find((row) => row.storeId === storeId && item.variantId && row.variantId === item.variantId)
    ?? rows.find((row) => row.storeId === storeId && item.productId && row.productId === item.productId)
    ?? rows.find((row) => row.storeId === storeId && item.sku && row.sku === item.sku);
  return {
    location: match?.location ?? '',
    remark: match?.remark ?? '',
    note: match?.note ?? '',
  };
}

function uniqueSearchTerms(tokens: string[]) {
  const terms = [tokens.join(' '), ...tokens]
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(terms));
}

function getPeriodStartDate(period: 'all' | 'week' | 'month' | 'year') {
  if (period === 'all') return null;
  const now = new Date();
  if (period === 'year') return new Date(now.getFullYear(), 0, 1);
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  const day = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - day);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function toConfiguredRecipients(userIds: string[], allowedUsers: NotifyRecipient[]): NotifyRecipient[] {
  const ids = Array.from(new Set(userIds.map((id) => id.trim()).filter(Boolean)));
  if (ids.length === 0) return [];
  const allowedById = new Map(allowedUsers.map((user) => [user.id, user]));
  return ids
    .map((id) => allowedById.get(id))
    .filter((user): user is NotifyRecipient => Boolean(user));
}

async function sendPackingEmail(params: {
  type: 'confirmed' | 'canceled';
  order: { id: string; number: number; cusName: string; store: { name: string | null; storeDomain: string } };
  lines: PickingLineInput[];
  items: OrderItem[];
  recipients: NotifyRecipient[];
  message: string;
  actor: Actor;
  originUrl?: string;
}) {
  const itemById = new Map(params.items.map((item) => [item.id, item]));
  const verb = params.type === 'confirmed' ? 'confirmed packed' : 'canceled packed';
  const lines = params.lines.map((line) => {
    const item = itemById.get(line.lineItemId);
    return `- ${item?.name ?? line.lineItemId} (${item?.sku || 'no SKU'}): x${line.quantity}`;
  }).join('\n');
  const actor = params.actor?.name || params.actor?.email || 'Order picker';
  const url = params.originUrl ? `${params.originUrl}/picking-list?search=${encodeURIComponent(params.order.number)}` : '';
  const note = params.message ? `\n\nMessage:\n${params.message}` : '';
  await sendAppMail({
    to: params.recipients.map((recipient) => recipient.email),
    subject: `Order ${params.order.number} packing ${params.type}`,
    text: `${actor} ${verb} items for order ${params.order.number} (${params.order.cusName}).\n\n${lines}${note}${url ? `\n\n${url}` : ''}`,
    html: `<p><strong>${escapeHtml(actor)}</strong> ${escapeHtml(verb)} items for order <strong>${escapeHtml(params.order.number)}</strong> (${escapeHtml(params.order.cusName)}).</p><pre>${escapeHtml(lines)}</pre>${params.message ? `<p><strong>Message:</strong><br>${escapeHtml(params.message).replace(/\n/g, '<br>')}</p>` : ''}${url ? `<p><a href="${escapeHtml(url)}">Open order</a></p>` : ''}`,
  });

  await Promise.all(params.recipients.map((r) =>
    createNotification({
      recipientId: r.id,
      type: 'packing_notification',
      title: `Packing ${params.type}`,
      body: `Order #${params.order.number} packing ${params.type} by ${params.actor?.name || 'picker'}`,
      orderId: params.order.id,
      orderNumber: String(params.order.number),
    })
  ));
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
