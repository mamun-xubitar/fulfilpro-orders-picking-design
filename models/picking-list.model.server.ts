import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma.server';
import { sendGoogleMail } from '@/lib/google-mail.server';
import { OrderModel } from '@/models/order.model.server';

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
};

export class PickingListModel {
  private readonly orderModel = new OrderModel();

  async list(params: {
    search?: string;
    storeIds?: string[];
    period?: 'all' | 'week' | 'month' | 'year';
    dateFrom?: string;
    dateTo?: string;
    packedStatuses?: string[];
    printStatuses?: string[];
    page: number;
    pageSize: number;
  }) {
    const where = buildOrderWhere(params);
    const [orders, stores] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          store: { select: { id: true, name: true, storeDomain: true } },
          packingConfirmations: { orderBy: { confirmedAt: 'desc' } },
          pickingSlipPrints: { orderBy: { printedAt: 'desc' }, take: 1 },
          _count: { select: { notes: true, messages: true } },
        },
        orderBy: { orderedAt: 'desc' },
      }),
      prisma.store.findMany({
        where: { status: 'connected' },
        select: { id: true, name: true, storeDomain: true },
        orderBy: [{ name: 'asc' }, { storeDomain: 'asc' }],
      }),
    ]);

    const rowsWithMetadata = await this.attachMetadata(orders.map(toPickingOrderRow));
    const searchTokens = (params.search?.trim() ?? '').split(/\s+/).filter(Boolean);
    const packedStatuses = new Set(params.packedStatuses ?? []);
    const printStatuses = new Set(params.printStatuses ?? []);
    const filtered = rowsWithMetadata.filter((row) => {
      if (searchTokens.length > 0 && !matchesSearch(row, searchTokens)) return false;
      if (packedStatuses.size > 0 && !packedStatuses.has(row.packingStatus)) return false;
      if (printStatuses.size > 0 && !printStatuses.has(row.printed ? 'printed' : 'not_printed')) return false;
      return true;
    }).sort((a, b) => comparePickingSearchRows(a, b, searchTokens));

    const total = filtered.length;
    const start = (params.page - 1) * params.pageSize;
    const pageRows = filtered.slice(start, start + params.pageSize);

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

  async listRecipients() {
    return prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    });
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

    const recipients = await getRecipients(params.notifyUserIds);
    const saved = await prisma.orderPackingConfirmation.create({
      data: {
        orderId: order.id,
        orderNumber: order.number,
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

    const recipients = await getRecipients(params.notifyUserIds);
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
        orderNumber: orderNumberById.get(order.orderId) ?? '',
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
        _count: { select: { notes: true, messages: true } },
      },
    });

    if (!order) throw new Error('Order not found');
    const [row] = await this.attachMetadata([toPickingOrderRow(order)]);
    return { order: row, savedConfirmationId };
  }

  private async attachMetadata<T extends { storeId: string; items: Array<OrderItem & { metadata: PickingMetadata }> }>(rows: T[]) {
    const metadataWhere = rows.flatMap((row) => row.items.flatMap((item) => [
      item.variantId ? { storeId: row.storeId, variantId: item.variantId } : null,
      item.productId ? { storeId: row.storeId, productId: item.productId } : null,
      item.sku ? { storeId: row.storeId, sku: item.sku } : null,
    ].filter(Boolean) as Prisma.OrderItemPickingMetadataWhereInput[]));

    const metadataRows = await prisma.orderItemPickingMetadata.findMany({
      where: metadataWhere.length > 0 ? { OR: metadataWhere } : { id: '__none__' },
    });

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

function buildOrderWhere(params: {
  storeIds?: string[];
  period?: 'all' | 'week' | 'month' | 'year';
  dateFrom?: string;
  dateTo?: string;
}) {
  const where: Prisma.OrderWhereInput = {
    store: {
      is: {
        status: 'connected',
        ...(params.storeIds && params.storeIds.length > 0 ? { id: { in: params.storeIds } } : {}),
      },
    },
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

function toPickingOrderRow(order: {
  id: string;
  number: string;
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
  lineItems: Prisma.JsonValue;
  store: { id: string; name: string | null; storeDomain: string };
  packingConfirmations: Array<{ id: string; lines: Prisma.JsonValue; confirmedAt: Date; canceledAt: Date | null }>;
  pickingSlipPrints: Array<{ printedAt: Date }>;
  _count: { notes: number; messages: number };
}) {
  const items = toLineItems(order.lineItems).map((item) => ({ ...item, metadata: { location: '', remark: '', note: '' } }));
  const activeConfirmations = order.packingConfirmations.filter((confirmation) => !confirmation.canceledAt);
  const packedByLine = getPackedByLine(activeConfirmations);
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
    storeId: order.store.id,
    storeName: order.store.name ?? order.store.storeDomain,
    storeDomain: order.store.storeDomain,
    items: items.map((item) => ({
      ...item,
      packedQuantity: packedByLine.get(item.id) ?? 0,
      packedDate: getLinePackedDate(activeConfirmations, item.id),
      lastPackedUpdate: getLinePackedDate(order.packingConfirmations, item.id),
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
    messageCount: order._count.messages,
    packingConfirmations: order.packingConfirmations.map((confirmation) => ({
      id: confirmation.id,
      confirmedAt: confirmation.confirmedAt.toISOString(),
      canceledAt: confirmation.canceledAt?.toISOString() ?? null,
      lines: normalizeStoredLines(confirmation.lines),
    })),
  };
}

function toLineItems(value: Prisma.JsonValue): OrderItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
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
    };
  });
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

function matchesSearch(row: ReturnType<typeof toPickingOrderRow>, tokens: string[]) {
  const haystack = [
    row.number,
    row.barcode,
    row.customer,
    row.customerEmail,
    row.address,
    row.address2,
    row.city,
    row.state,
    row.zip,
    row.country,
    row.storeName,
    row.storeDomain,
    row.packingStatus.replaceAll('_', ' '),
    row.printed ? 'printed slip printed' : 'not printed slip not printed',
    JSON.stringify(row.items),
  ].join(' ').toLowerCase();
  return tokens.every((token) => haystack.includes(token.toLowerCase()));
}

function comparePickingSearchRows(
  a: ReturnType<typeof toPickingOrderRow>,
  b: ReturnType<typeof toPickingOrderRow>,
  tokens: string[]
) {
  if (tokens.length === 0) {
    return compareOrderDatesDesc(a, b);
  }

  const rankDiff = getPickingSearchRank(a, tokens) - getPickingSearchRank(b, tokens);
  if (rankDiff !== 0) return rankDiff;
  return compareOrderDatesDesc(a, b);
}

function compareOrderDatesDesc(a: ReturnType<typeof toPickingOrderRow>, b: ReturnType<typeof toPickingOrderRow>) {
  return new Date(b.orderedAt || 0).getTime() - new Date(a.orderedAt || 0).getTime();
}

function getPickingSearchRank(row: ReturnType<typeof toPickingOrderRow>, tokens: string[]) {
  const terms = uniqueSearchTerms(tokens);
  const orderNumber = row.number.toLowerCase();
  const barcode = (row.barcode ?? '').toLowerCase();
  const customer = `${row.customer} ${row.customerEmail ?? ''}`.toLowerCase();
  const store = `${row.storeName} ${row.storeDomain}`.toLowerCase();
  const address = [row.address, row.address2, row.city, row.state, row.country].join(' ').toLowerCase();
  const lineItems = JSON.stringify(row.items).toLowerCase();

  if (terms.some((term) => orderNumber === term)) return 0;
  if (terms.some((term) => orderNumber.startsWith(term))) return 1;
  if (terms.some((term) => barcode && barcode === term)) return 2;
  if (terms.some((term) => barcode && barcode.startsWith(term))) return 3;
  if (terms.some((term) => orderNumber.includes(term))) return 4;
  if (terms.some((term) => barcode && barcode.includes(term))) return 5;
  if (terms.some((term) => customer.split(/\s+/).includes(term))) return 6;
  if (terms.some((term) => customer.includes(term))) return 8;
  if (terms.some((term) => store.includes(term))) return 10;
  if (terms.some((term) => address.includes(term))) return 11;
  if (terms.some((term) => lineItems.includes(term))) return 12;
  return 20;
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

async function getRecipients(userIds: string[]): Promise<NotifyRecipient[]> {
  const ids = Array.from(new Set(userIds.map((id) => id.trim()).filter(Boolean)));
  if (ids.length === 0) return [];
  return prisma.user.findMany({
    where: { id: { in: ids }, active: true },
    select: { id: true, name: true, email: true, role: true },
  });
}

async function sendPackingEmail(params: {
  type: 'confirmed' | 'canceled';
  order: { id: string; number: string; cusName: string; store: { name: string | null; storeDomain: string } };
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
  await sendGoogleMail({
    to: params.recipients.map((recipient) => recipient.email),
    subject: `Order ${params.order.number} packing ${params.type}`,
    text: `${actor} ${verb} items for order ${params.order.number} (${params.order.cusName}).\n\n${lines}${note}${url ? `\n\n${url}` : ''}`,
    html: `<p><strong>${escapeHtml(actor)}</strong> ${escapeHtml(verb)} items for order <strong>${escapeHtml(params.order.number)}</strong> (${escapeHtml(params.order.cusName)}).</p><pre>${escapeHtml(lines)}</pre>${params.message ? `<p><strong>Message:</strong><br>${escapeHtml(params.message).replace(/\n/g, '<br>')}</p>` : ''}${url ? `<p><a href="${escapeHtml(url)}">Open order</a></p>` : ''}`,
  });
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
