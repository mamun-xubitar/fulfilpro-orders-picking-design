import prisma from '@/lib/prisma.server';
import { sendAppMail } from '@/lib/email.server';
import {
  isBackInStockRequesterUpdatesEnabled,
  resolveHiddenRecipientEmails,
  resolveHiddenRecipientIds,
} from '@/lib/email-rules.server';
import { createNotification } from '@/lib/notifications.server';
import { Prisma } from '@prisma/client';

export type BackInStockStatus = 'pending' | 'partially_back_in_stock' | 'back_in_stock';

export type BackInStockItemInput = {
  lineItemId: string;
  dueDate: string;
  supplierName: string;
  quantity: number;
  item: string;
  restockedQuantity?: number;
};

export type BackInStockMessageRow = {
  id: string;
  senderName: string;
  senderEmail: string;
  senderRole: string;
  message: string;
  status: BackInStockStatus | null;
  createdAt: string;
};

export type BackInStockRequestRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  status: BackInStockStatus;
  items: BackInStockItemInput[];
  requestMessage: string | null;
  requesterViewedAt: string | null;
  lastAdminUpdateAt: string | null;
  unreadUpdateCount: number;
  messages: BackInStockMessageRow[];
  createdAt: string;
  updatedAt: string;
};

export class BackInStockModel {
  async list(params: {
    search?: string;
    status?: string;
    requesterId?: string;
    page: number;
    pageSize: number;
  }) {
    const where: Prisma.BackInStockRequestWhereInput = {};
    const search = params.search?.trim();

    // if (params.requesterId) {
    //   where.requesterId = params.requesterId;
    // }

    if (isBackInStockStatus(params.status)) {
      where.status = params.status;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { requesterName: { contains: search, mode: 'insensitive' } },
        { requesterEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.backInStockRequest.count({ where }),
      prisma.backInStockRequest.findMany({
        where,
        include: { messages: { orderBy: { createdAt: 'desc' } } },
        orderBy: { updatedAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);

    return { total, requests: rows.map(toRow) };
  }

  async listForOrder(orderId: string, viewerId: string, isAdmin: boolean) {
    const rows = await prisma.backInStockRequest.findMany({
      where: {
        orderId,
        // ...(isAdmin ? {} : { requesterId: viewerId })
      },
      include: { messages: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });

    await prisma.backInStockRequest.updateMany({
      where: {
        orderId,
        // requesterId: viewerId,
        OR: [
          { requesterViewedAt: null },
          { requesterViewedAt: { lt: new Date() } },
        ],
      },
      data: { requesterViewedAt: new Date() },
    });

    return rows.map((row) => (
      toRow(row)
    ));
  }

  async create(params: {
    orderId: string;
    requester: { id: string; name: string; email: string };
    items: BackInStockItemInput[];
    message?: string;
  }) {
    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
      select: { id: true, number: true, lineItems: true, fulfillmentItems: true },
    });
    if (!order) throw new Error('Order not found');
    const normalizedItems = normalizeRequestedItems(order.lineItems, order.fulfillmentItems, params.items);

    const existing = await prisma.backInStockRequest.findFirst({
      where: {
        orderId: order.id,
        // requesterId: params.requester.id,
        status: { in: ['pending', 'partially_back_in_stock'] },
      },
      include: { messages: { orderBy: { createdAt: 'desc' } } },
    });
    if (existing) return toRow(existing);

    const request = await prisma.backInStockRequest.create({
      data: {
        orderId: order.id,
        orderNumber: String(order.number),
        requesterId: params.requester.id,
        requesterName: params.requester.name,
        requesterEmail: params.requester.email,
        items: normalizedItems as unknown as Prisma.InputJsonValue,
        requestMessage: params.message || null,
        requesterViewedAt: new Date(),
        messages: params.message
          ? {
            create: {
              senderId: params.requester.id,
              senderName: params.requester.name,
              senderEmail: params.requester.email,
              senderRole: 'requester',
              message: params.message,
              status: 'pending',
            },
          }
          : undefined,
      },
      include: { messages: { orderBy: { createdAt: 'desc' } } },
    });

    void notifyAdmins(request).catch(() => undefined);

    return toRow(request);
  }

  async searchOrderOptions(params: { search: string; storeIds: string[] | null; limit: number }): Promise<BackInStockOrderOption[]> {
    if (params.storeIds && params.storeIds.length === 0) return [];

    const whereParts: Prisma.Sql[] = [Prisma.sql`1 = 1`];
    if (params.storeIds) {
      whereParts.push(Prisma.sql`o."storeId" IN (${Prisma.join(params.storeIds)})`);
    }

    const search = params.search.trim();
    if (search) {
      whereParts.push(Prisma.sql`(
        ${ilikeContains(Prisma.sql`o."number"::text`, search)}
        OR ${ilikeContains(Prisma.sql`o."cusName"`, search)}
        OR ${ilikeContains(Prisma.sql`s.name`, search)}
        OR ${ilikeContains(Prisma.sql`s."storeDomain"`, search)}
      )`);
    }

    const rows = await prisma.$queryRaw<Array<{
      id: string;
      number: number;
      cusName: string;
      lineItems: Prisma.JsonValue;
      fulfillmentItems: Prisma.JsonValue | null;
      storeId: string;
      storeName: string | null;
      storeDomain: string;
    }>>(Prisma.sql`
      SELECT o.id, o."number", o."cusName", o."lineItems", o."fulfillmentItems",
        s.id AS "storeId", s.name AS "storeName", s."storeDomain"
      FROM "Order" o
      INNER JOIN "Store" s ON s.id = o."storeId"
      WHERE ${Prisma.join(whereParts, ' AND ')}
      ORDER BY o."orderedAt" DESC NULLS LAST
      LIMIT 200
    `);

    return rows
      .map((row) => ({
        id: row.id,
        number: row.number,
        customer: row.cusName,
        storeId: row.storeId,
        storeName: row.storeName ?? row.storeDomain,
        eligibleItems: getEligibleLineItems(row.lineItems, row.fulfillmentItems),
      }))
      .filter((option) => option.eligibleItems.length > 0)
      .slice(0, params.limit);
  }

  async adminUpdate(params: {
    requestId: string;
    admin: { id: string; name: string; email: string; role: string };
    items?: Array<{ lineItemId: string; restockedQuantity: number }>;
    message?: string;
  }) {
    const existing = await prisma.backInStockRequest.findUnique({
      where: { id: params.requestId },
    });
    if (!existing) throw new Error('Request not found');

    const currentItems = toItems(existing.items);
    const nextItems = params.items ? applyRestockedQuantities(currentItems, params.items) : currentItems;
    const nextStatus = getStatusFromRestockedItems(nextItems);
    const quantitiesChanged = JSON.stringify(currentItems.map(toQuantitySnapshot)) !== JSON.stringify(nextItems.map(toQuantitySnapshot));
    const message = params.message?.trim() || (quantitiesChanged ? 'Restock quantities updated.' : '');
    if (!message) throw new Error('Message is required');

    const updated = await prisma.backInStockRequest.update({
      where: { id: params.requestId },
      data: {
        items: nextItems as unknown as Prisma.InputJsonValue,
        status: nextStatus,
        lastAdminUpdateAt: new Date(),
        messages: {
          create: {
            senderId: params.admin.id,
            senderName: params.admin.name,
            senderEmail: params.admin.email,
            senderRole: params.admin.role,
            message,
            status: nextStatus,
          },
        },
      },
      include: { messages: { orderBy: { createdAt: 'desc' } } },
    });

    void notifyRequester(updated, message).catch(() => undefined);

    return toRow(updated);
  }
}

function toRow(row: {
  id: string;
  orderId: string;
  orderNumber: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  status: string;
  items: Prisma.JsonValue;
  requestMessage: string | null;
  requesterViewedAt: Date | null;
  lastAdminUpdateAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{
    id: string;
    senderName: string;
    senderEmail: string;
    senderRole: string;
    message: string;
    status: string | null;
    createdAt: Date;
  }>;
}): BackInStockRequestRow {
  return {
    id: row.id,
    orderId: row.orderId,
    orderNumber: row.orderNumber,
    requesterId: row.requesterId,
    requesterName: row.requesterName,
    requesterEmail: row.requesterEmail,
    status: isBackInStockStatus(row.status) ? row.status : 'pending',
    items: toItems(row.items),
    requestMessage: row.requestMessage,
    requesterViewedAt: row.requesterViewedAt?.toISOString() ?? null,
    lastAdminUpdateAt: row.lastAdminUpdateAt?.toISOString() ?? null,
    unreadUpdateCount: getUnreadUpdateCount(row),
    messages: row.messages.map((message) => ({
      id: message.id,
      senderName: message.senderName,
      senderEmail: message.senderEmail,
      senderRole: message.senderRole,
      message: message.message,
      status: isBackInStockStatus(message.status) ? message.status : null,
      createdAt: message.createdAt.toISOString(),
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function getUnreadUpdateCount(row: {
  requesterViewedAt: Date | null;
  messages: Array<{ senderRole: string; createdAt: Date }>;
}) {
  const viewedAt = row.requesterViewedAt?.getTime() ?? 0;
  return row.messages.filter((message) => message.senderRole === 'admin' && message.createdAt.getTime() > viewedAt).length;
}

export function isBackInStockStatus(value: unknown): value is BackInStockStatus {
  return value === 'pending' || value === 'partially_back_in_stock' || value === 'back_in_stock';
}

function toItems(value: Prisma.JsonValue): BackInStockItemInput[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    const lineItemId = typeof row.lineItemId === 'string' ? row.lineItemId : '';
    const dueDate = typeof row.dueDate === 'string' ? row.dueDate : '';
    const supplierName = typeof row.supplierName === 'string' ? row.supplierName : '';
    const quantity = typeof row.quantity === 'number' ? row.quantity : Number(row.quantity ?? 0);
    const restockedQuantity = typeof row.restockedQuantity === 'number' ? row.restockedQuantity : Number(row.restockedQuantity ?? 0);
    const itemName = typeof row.item === 'string' ? row.item : '';
    if (!dueDate || !supplierName || !itemName || !Number.isFinite(quantity) || quantity <= 0) return [];
    return [{
      lineItemId,
      dueDate,
      supplierName,
      quantity,
      item: itemName,
      restockedQuantity: Number.isFinite(restockedQuantity) ? Math.min(quantity, Math.max(0, Math.floor(restockedQuantity))) : 0,
    }];
  });
}

function normalizeRequestedItems(
  lineItemsJson: Prisma.JsonValue,
  fulfillmentItemsJson: Prisma.JsonValue | null,
  items: BackInStockItemInput[]
): BackInStockItemInput[] {
  const orderItems = toOrderLineItems(lineItemsJson);
  const fulfilledByLineId = getFulfilledQuantityByLineId(fulfillmentItemsJson);
  const orderItemById = new Map(orderItems.map((item) => [item.id, item]));
  const requestedLineIds = new Set<string>();

  const normalized = items.map((item) => {
    if (requestedLineIds.has(item.lineItemId)) {
      throw new Error('Each product can only be selected once');
    }
    requestedLineIds.add(item.lineItemId);

    const orderItem = orderItemById.get(item.lineItemId);
    if (!orderItem) throw new Error('Selected item was not found on this order');

    const remainingQty = Math.max(0, orderItem.qty - (fulfilledByLineId.get(item.lineItemId) ?? 0));
    if (remainingQty <= 0) throw new Error(`${orderItem.name} is already fulfilled`);
    if (item.quantity > remainingQty) throw new Error(`${orderItem.name} only has ${remainingQty} unfulfilled`);

    return {
      ...item,
      item: orderItem.name,
      quantity: Math.floor(item.quantity),
      restockedQuantity: 0,
    };
  });

  if (normalized.length === 0) throw new Error('No product to request back in stock');
  return normalized;
}

function ilikeContains(field: Prisma.Sql, value: string) {
  return Prisma.sql`COALESCE(${field}, '') ILIKE ${buildLikePattern(value)} ESCAPE '\\'`;
}

function buildLikePattern(value: string) {
  const escaped = value.replace(/[\\%_]/g, (char) => `\\${char}`);
  return `%${escaped}%`;
}

function toOrderLineItems(value: Prisma.JsonValue): Array<{ id: string; name: string; qty: number; sku: string; vendor: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const obj = item as Record<string, unknown>;
    const id = typeof obj.id === 'string' ? obj.id : String(obj.id ?? '');
    const name = typeof obj.name === 'string' ? obj.name : '';
    const qty = typeof obj.qty === 'number' ? obj.qty : Number(obj.qty ?? 0);
    const sku = typeof obj.sku === 'string' ? obj.sku : '';
    const vendor = typeof obj.vendor === 'string' ? obj.vendor : '';
    return id && name && Number.isFinite(qty) ? [{ id, name, qty, sku, vendor }] : [];
  });
}

export type BackInStockOrderOption = {
  id: string;
  number: number;
  customer: string;
  storeId: string;
  storeName: string;
  eligibleItems: Array<{ lineItemId: string; name: string; sku: string; vendor: string; remainingQty: number }>;
};

function getEligibleLineItems(
  lineItemsJson: Prisma.JsonValue,
  fulfillmentItemsJson: Prisma.JsonValue | null
): BackInStockOrderOption['eligibleItems'] {
  const orderItems = toOrderLineItems(lineItemsJson);
  const fulfilledByLineId = getFulfilledQuantityByLineId(fulfillmentItemsJson);

  return orderItems
    .map((item) => ({
      lineItemId: item.id,
      name: item.name,
      sku: item.sku,
      vendor: item.vendor,
      remainingQty: Math.max(0, item.qty - (fulfilledByLineId.get(item.id) ?? 0)),
    }))
    .filter((item) => item.remainingQty > 0);
}

function getFulfilledQuantityByLineId(value: Prisma.JsonValue | null) {
  const result = new Map<string, number>();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  const confirmations = Array.isArray((value as Record<string, unknown>).confirmations)
    ? (value as Record<string, unknown>).confirmations as unknown[]
    : [];

  confirmations.forEach((confirmation) => {
    if (!confirmation || typeof confirmation !== 'object') return;
    const lines = Array.isArray((confirmation as Record<string, unknown>).lines)
      ? (confirmation as Record<string, unknown>).lines as unknown[]
      : [];
    lines.forEach((line) => {
      if (!line || typeof line !== 'object') return;
      const row = line as Record<string, unknown>;
      const lineItemId = typeof row.lineItemId === 'string' ? row.lineItemId : '';
      const quantity = typeof row.quantity === 'number' ? row.quantity : Number(row.quantity ?? 0);
      if (!lineItemId || !Number.isFinite(quantity)) return;
      result.set(lineItemId, (result.get(lineItemId) ?? 0) + quantity);
    });
  });

  return result;
}

function applyRestockedQuantities(
  currentItems: BackInStockItemInput[],
  updates: Array<{ lineItemId: string; restockedQuantity: number }>
) {
  const updateByLineId = new Map(updates.map((item) => [item.lineItemId, item.restockedQuantity]));

  for (const update of updates) {
    if (!currentItems.some((item) => item.lineItemId === update.lineItemId)) {
      throw new Error('Selected item was not found on this request');
    }
  }

  return currentItems.map((item) => {
    if (!updateByLineId.has(item.lineItemId)) return item;
    const value = Math.floor(Number(updateByLineId.get(item.lineItemId)));
    if (!Number.isFinite(value) || value < 0) throw new Error('Restocked quantity must be zero or greater');
    if (value > item.quantity) throw new Error(`${item.item} can only restock up to ${item.quantity}`);
    return { ...item, restockedQuantity: value };
  });
}

function getStatusFromRestockedItems(items: BackInStockItemInput[]): BackInStockStatus {
  const requested = items.reduce((sum, item) => sum + Math.max(0, item.quantity), 0);
  const restocked = items.reduce((sum, item) => sum + Math.min(Math.max(0, item.restockedQuantity ?? 0), item.quantity), 0);
  if (requested > 0 && restocked >= requested) return 'back_in_stock';
  if (restocked > 0) return 'partially_back_in_stock';
  return 'pending';
}

function toQuantitySnapshot(item: BackInStockItemInput) {
  return { lineItemId: item.lineItemId, restockedQuantity: item.restockedQuantity ?? 0 };
}

async function notifyAdmins(request: { orderNumber: string; requesterName: string; requesterEmail: string; items: Prisma.JsonValue; requestMessage: string | null }) {
  const [recipients, recipientIds] = await Promise.all([
    resolveHiddenRecipientEmails('back_in_stock_admin'),
    resolveHiddenRecipientIds('back_in_stock_admin'),
  ]);

  if (recipients.length > 0) {
    const row = { ...request, items: toItems(request.items) };
    await sendAppMail({
      to: recipients,
      subject: `Back in stock request for Order #${request.orderNumber}`,
      text: buildRequestText(row),
      html: buildRequestHtml(row),
    });
  }

  await Promise.all(recipientIds.map((id) =>
    createNotification({
      recipientId: id,
      type: 'back_in_stock_request',
      title: 'New back-in-stock request',
      body: `Order #${request.orderNumber} from ${request.requesterName}`,
    })
  ));
}

async function notifyRequester(request: { orderNumber: string; requesterId: string; requesterEmail: string; status: string; items: Prisma.JsonValue }, message: string) {
  const requesterUpdatesEnabled = await isBackInStockRequesterUpdatesEnabled();
  if (!requesterUpdatesEnabled) return;

  const items = toItems(request.items);
  await sendAppMail({
    to: [request.requesterEmail],
    subject: `Back in stock update for Order #${request.orderNumber}`,
    text: [
      `Back in stock request updated`,
      ``,
      `Order: #${request.orderNumber}`,
      `Status: ${formatStatus(request.status)}`,
      ``,
      `Items:`,
      ...items.map((item, index) => `${index + 1}. ${item.item} - restocked ${item.restockedQuantity ?? 0}/${item.quantity}, supplier ${item.supplierName}, due ${item.dueDate}`),
      ``,
      message,
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;max-width:600px">
        <h2 style="margin:0 0 12px">Back in stock request updated</h2>
        <p style="margin:0 0 4px"><strong>Order:</strong> #${escapeHtml(request.orderNumber)}</p>
        <p style="margin:0 0 16px"><strong>Status:</strong> ${escapeHtml(formatStatus(request.status))}</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px;margin:0 0 16px">
          <thead><tr><th align="left" style="border-bottom:1px solid #e5e7eb;padding:6px">Item</th><th align="left" style="border-bottom:1px solid #e5e7eb;padding:6px">Supplier</th><th align="center" style="border-bottom:1px solid #e5e7eb;padding:6px">Restocked</th><th align="left" style="border-bottom:1px solid #e5e7eb;padding:6px">Due</th></tr></thead>
          <tbody>${items.map((item) => `<tr><td style="border-bottom:1px solid #f3f4f6;padding:6px">${escapeHtml(item.item)}</td><td style="border-bottom:1px solid #f3f4f6;padding:6px">${escapeHtml(item.supplierName)}</td><td align="center" style="border-bottom:1px solid #f3f4f6;padding:6px">${item.restockedQuantity ?? 0}/${item.quantity}</td><td style="border-bottom:1px solid #f3f4f6;padding:6px">${escapeHtml(item.dueDate)}</td></tr>`).join('')}</tbody>
        </table>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;white-space:pre-wrap">${escapeHtml(message)}</div>
      </div>
    `,
  });

  await createNotification({
    recipientId: request.requesterId,
    type: 'back_in_stock_update',
    title: 'Back-in-stock request updated',
    body: `Your request for Order #${request.orderNumber} has been updated`,
  });
}

function buildRequestText(request: { orderNumber: string; requesterName: string; requesterEmail: string; items: BackInStockItemInput[]; requestMessage: string | null }) {
  return [
    `Back in stock request`,
    ``,
    `Order: #${request.orderNumber}`,
    `Requester: ${request.requesterName} (${request.requesterEmail})`,
    ``,
    `Items:`,
    ...request.items.map((item, index) => `${index + 1}. ${item.item} - qty ${item.quantity}, supplier ${item.supplierName}, due ${item.dueDate}`),
    request.requestMessage ? `\nMessage:\n${request.requestMessage}` : '',
  ].filter(Boolean).join('\n');
}

function buildRequestHtml(request: { orderNumber: string; requesterName: string; requesterEmail: string; items: BackInStockItemInput[]; requestMessage: string | null }) {
  return `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;max-width:680px">
      <h2 style="margin:0 0 12px">Back in stock request</h2>
      <p style="margin:0 0 4px"><strong>Order:</strong> #${escapeHtml(request.orderNumber)}</p>
      <p style="margin:0 0 16px"><strong>Requester:</strong> ${escapeHtml(request.requesterName)} &lt;${escapeHtml(request.requesterEmail)}&gt;</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <thead><tr><th align="left" style="border-bottom:1px solid #e5e7eb;padding:6px">Item</th><th align="left" style="border-bottom:1px solid #e5e7eb;padding:6px">Supplier</th><th align="center" style="border-bottom:1px solid #e5e7eb;padding:6px">Qty</th><th align="left" style="border-bottom:1px solid #e5e7eb;padding:6px">Due</th></tr></thead>
        <tbody>${request.items.map((item) => `<tr><td style="border-bottom:1px solid #f3f4f6;padding:6px">${escapeHtml(item.item)}</td><td style="border-bottom:1px solid #f3f4f6;padding:6px">${escapeHtml(item.supplierName)}</td><td align="center" style="border-bottom:1px solid #f3f4f6;padding:6px">${item.quantity}</td><td style="border-bottom:1px solid #f3f4f6;padding:6px">${escapeHtml(item.dueDate)}</td></tr>`).join('')}</tbody>
      </table>
      ${request.requestMessage ? `<p style="font-weight:600;margin:16px 0 4px">Message</p><div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;white-space:pre-wrap">${escapeHtml(request.requestMessage)}</div>` : ''}
    </div>
  `;
}

function formatStatus(status: string) {
  if (status === 'back_in_stock') return 'Restocked';
  if (status === 'partially_back_in_stock') return 'Partially Restocked';
  return 'Pending';
}

function escapeHtml(v: string | null | undefined) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
