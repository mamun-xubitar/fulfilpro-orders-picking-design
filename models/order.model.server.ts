import prisma from '@/lib/prisma.server';
import {
  createShopifyFulfillment,
  type FulfillmentRequestLine,
  type FulfillmentTrackingInput,
} from '@/lib/shopify-fulfillment.server';
import { Prisma } from '@prisma/client';

export type ShopifyOrderPayload = {
  id?: string | number;
  name?: string;
  order_number: number;
  email?: string | null;
  phone?: string | null;
  total_price?: string | number | null;
  current_total_price?: string | number | null;
  fulfillment_status?: string | null;
  created_at: string;
  closed_at?: string | null;
  cancelled_at?: string | null;
  canceled_at?: string | null;
  total_price_set?: {
    shop_money?: {
      amount?: string | number | null;
      currency_code?: string | null;
    };
  };
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  shipping_address?: {
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    province?: string | null;
    zip?: string | null;
    country?: string | null;
    phone?: string | null;
    name?: string | null;
  } | null;
  line_items?: Array<{
    id: number;
    name?: string | null;
    sku?: string | null;
    quantity?: number | null;
    price?: string | number | null;
    price_set?: {
      shop_money?: {
        amount?: string | number | null;
        currency_code?: string | null;
      };
    };
  }> | null;
  fulfillments?: Array<{
    id?: string | number;
    status?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    tracking_number?: string | null;
    tracking_company?: string | null;
    tracking_url?: string | null;
    line_items?: Array<{
      id?: string | number | null;
      quantity?: number | null;
    }> | null;
  }> | null;
};

export type FulfillmentLineInput = {
  lineItemId: string;
  quantity: number;
  full: boolean;
};

export class OrderModel {
  async createIfMissingFromOrderCreateWebhook(params: {
    payload: ShopifyOrderPayload;
    storeId: string;
    storeDomain: string;
  }) {
    const { payload, storeId } = params;
    console.log('Processing order webhook', JSON.stringify(payload, null, 2));
    const exists = await prisma.order.findUnique({
      where: { number: `${payload.order_number}` },
      select: { id: true },
    });

    if (exists) {
      return { created: false };
    }

    await prisma.order.create({
      data: buildOrderCreateData(payload, storeId),
    });

    return { created: true };
  }

  async upsertFromShopifyOrder(params: {
    payload: ShopifyOrderPayload;
    storeId: string;
  }) {
    const { payload, storeId } = params;
    const number = `${payload.order_number}`;
    const existing = await prisma.order.findUnique({
      where: { number },
      select: {
        id: true,
        fulfillmentItems: true,
      },
    });

    if (!existing) {
      await prisma.order.create({
        data: buildOrderCreateData(payload, storeId),
      });
      return { created: true, updated: false };
    }

    await prisma.order.update({
      where: { id: existing.id },
      data: buildOrderUpdateData(payload, storeId, existing.fulfillmentItems),
    });

    return { created: false, updated: true };
  }

  async listForConnectedStores(params: {
    search?: string;
    storeId?: string;
    period?: 'all' | 'week' | 'month' | 'year';
    page: number;
    pageSize: number;
  }) {
    const { search, storeId, period = 'all', page, pageSize } = params;
    const where: Prisma.OrderWhereInput = {
      store: {
        is: {
          status: 'connected',
          ...(storeId ? { id: storeId } : {}),
        },
      },
    };

    const trimmedSearch = search?.trim();
    if (trimmedSearch) {
      where.OR = [
        { number: { contains: trimmedSearch, mode: 'insensitive' } },
        { cusName: { contains: trimmedSearch, mode: 'insensitive' } },
        { cusEmail: { contains: trimmedSearch, mode: 'insensitive' } },
        { store: { is: { name: { contains: trimmedSearch, mode: 'insensitive' } } } },
        { store: { is: { storeDomain: { contains: trimmedSearch, mode: 'insensitive' } } } },
      ];
    }

    const periodDate = getPeriodStartDate(period);
    if (periodDate) {
      where.createdAt = { gte: periodDate };
    }

    const [total, rows] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          store: {
            select: {
              id: true,
              name: true,
              storeDomain: true,
            },
          },
        },
        orderBy: { orderedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const orders = rows.map((row) => {
      const lineItems = toLineItems(row.lineItems);
      const itemCount = lineItems.reduce((sum, item) => sum + Math.max(0, item.qty), 0);
      return {
        id: row.id,
        number: row.number,
        customer: row.cusName,
        // customerEmail: row.cusEmail,
        address: row.address,
        address2: row.address2,
        city: row.city,
        state: row.state,
        country: row.country,
        closed: row.closed,
        closedAt: row.closedAt?.toISOString() ?? null,
        canceled: row.canceled,
        canceledAt: row.canceledAt?.toISOString() ?? null,
        status: getDisplayStatus(row),
        orderedAt: row.orderedAt?.toISOString(),
        storeId: row.store.id,
        storeName: row.store.name ?? row.store.storeDomain,
        storeDomain: row.store.storeDomain,
        items: lineItems,
        fulfillmentItems: toFulfillmentItems(row.fulfillmentItems),
        itemsCount: itemCount,
      };
    });

    return { total, orders };
  }

  async getConnectedStoreOptions() {
    const stores = await prisma.store.findMany({
      where: { status: 'connected' },
      select: {
        id: true,
        name: true,
        storeDomain: true,
      },
      orderBy: [{ name: 'asc' }, { storeDomain: 'asc' }],
    });

    return stores.map((store) => ({
      id: store.id,
      name: store.name ?? store.storeDomain,
      storeDomain: store.storeDomain,
    }));
  }

  async confirmFulfillment(
    orderId: string,
    lines: FulfillmentLineInput[],
    notifyCustomer: boolean,
    trackingInfo: FulfillmentTrackingInput | null
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: {
          select: {
            storeDomain: true,
            accessToken: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.store.accessToken) {
      throw new Error('Store is missing a Shopify access token');
    }

    if (order.canceled) {
      throw new Error('Canceled orders cannot be fulfilled');
    }

    if (order.closed) {
      throw new Error('Closed orders cannot be fulfilled');
    }

    const lineItems = toLineItems(order.lineItems);
    const fulfillableLines = normalizeFulfillmentLines(lines, lineItems);
    const currentFulfillmentItems = toFulfillmentItems(order.fulfillmentItems);
    const shopifyResult = await createShopifyFulfillment({
      shop: order.store.storeDomain,
      accessToken: order.store.accessToken,
      orderNumber: order.number,
      shopifyOrderId: currentFulfillmentItems.shopifyOrderId,
      notifyCustomer,
      trackingInfo,
      lines: fulfillableLines.map((line) => ({
        lineItemId: line.lineItemId,
        quantity: line.quantity,
      })),
    });

    const confirmation = {
      id: crypto.randomUUID(),
      confirmedAt: new Date().toISOString(),
      shopifyFulfillmentId: shopifyResult.fulfillmentId,
      shopifyFulfillmentStatus: shopifyResult.fulfillmentStatus,
      notifyCustomer,
      trackingInfo,
      lines: fulfillableLines,
    };

    const nextFulfillmentItems = {
      shopifyOrderId: currentFulfillmentItems.shopifyOrderId ?? shopifyResult.orderId,
      confirmations: [...currentFulfillmentItems.confirmations, confirmation],
    };

    const totalQuantity = lineItems.reduce((sum, item) => sum + Math.max(0, item.qty), 0);
    const fulfilledQuantity = nextFulfillmentItems.confirmations.reduce((sum, item) => {
      return sum + item.lines.reduce((lineSum, line) => lineSum + line.quantity, 0);
    }, 0);
    const fulfillmentStatus = fulfilledQuantity >= totalQuantity ? 'fulfilled' : fulfilledQuantity > 0 ? 'partial' : 'unfulfilled';

    await prisma.order.update({
      where: { id: order.id },
      data: {
        fulfillmentItems: nextFulfillmentItems,
        fulfillmentStatus,
      },
    });

    return {
      orderId: order.id,
      status: fulfillmentStatus,
      fulfillmentItems: nextFulfillmentItems,
    };
  }
}

function buildOrderCreateData(payload: ShopifyOrderPayload, storeId: string): Prisma.OrderUncheckedCreateInput {
  const data = buildOrderWriteData(payload, storeId, null);
  return {
    number: `${payload.order_number}`,
    ...data,
  };
}

function buildOrderUpdateData(
  payload: ShopifyOrderPayload,
  storeId: string,
  existingFulfillmentItems: Prisma.JsonValue | null
): Prisma.OrderUncheckedUpdateInput {
  return buildOrderWriteData(payload, storeId, existingFulfillmentItems);
}

function buildOrderWriteData(
  payload: ShopifyOrderPayload,
  storeId: string,
  existingFulfillmentItems: Prisma.JsonValue | null
) {
  const lineItems = (payload.line_items ?? []).map((item) => ({
    id: item.id,
    name: item.name ?? '',
    sku: item.sku ?? '',
    qty: Number(item.quantity ?? 0),
    price: Number(item.price_set?.shop_money?.amount ?? item.price ?? 0),
    currencyCode: item.price_set?.shop_money?.currency_code ?? null,
  }));

  const shippingAddress = payload.shipping_address;
  const customerName =
    `${payload.customer?.first_name ?? ''} ${payload.customer?.last_name ?? ''}`.trim() ||
    shippingAddress?.name?.trim() ||
    'Unknown Customer';
  const customerEmail = payload.customer?.email ?? payload.email ?? null;
  const customerPhone = payload.customer?.phone ?? payload.phone ?? shippingAddress?.phone ?? null;
  const fulfillmentStatus = resolveFulfillmentStatus(payload.fulfillment_status);
  const canceledAt = parseOptionalDate(payload.cancelled_at ?? payload.canceled_at ?? null);
  const closedAt = parseOptionalDate(payload.closed_at ?? null);
  const priceRaw = payload.total_price_set?.shop_money?.amount ?? payload.total_price ?? payload.current_total_price ?? 0;
  const price = Number(priceRaw);
  const currencyCode = payload.total_price_set?.shop_money?.currency_code ?? null;
  const currentFulfillmentItems = toFulfillmentItems(existingFulfillmentItems);
  const syncedFulfillmentConfirmations = toShopifyFulfillmentConfirmations(payload);
  // console.log("payload", JSON.stringify(payload, null, 2));
  const shopifyOrderId = payload.id ? `gid://shopify/Order/${payload.id}` : currentFulfillmentItems.shopifyOrderId;
  const fulfillmentItems = {
    shopifyOrderId,
    confirmations: mergeFulfillmentConfirmations(
      currentFulfillmentItems.confirmations,
      syncedFulfillmentConfirmations
    ),
  } as Prisma.InputJsonValue;

  return {
    cusName: customerName,
    cusEmail: customerEmail,
    address: shippingAddress?.address1 ?? null,
    address2: shippingAddress?.address2 ?? null,
    phone: customerPhone,
    city: shippingAddress?.city ?? null,
    state: shippingAddress?.province ?? null,
    zip: shippingAddress?.zip ?? null,
    country: shippingAddress?.country ?? null,
    fulfillmentStatus,
    canceled: Boolean(canceledAt),
    canceledAt,
    closed: Boolean(closedAt),
    closedAt,
    boarcode: extractBarcode(lineItems),
    lineItems,
    fulfillmentItems,
    price: Number.isFinite(price) ? price : 0,
    currencyCode,
    storeId,
    orderedAt: new Date(payload.created_at),
  };
}

function resolveFulfillmentStatus(payloadStatus?: string | null) {
  const normalized = (payloadStatus ?? '').toLowerCase();
  if (normalized.includes('partial')) return 'partial';
  if (normalized.includes('fulfill')) return 'fulfilled';
  return normalized || 'unfulfilled';
}

function getDisplayStatus(order: { canceled: boolean; closed: boolean; fulfillmentStatus: string | null }) {
  if (order.canceled) return 'canceled';
  if (order.closed && isFulfilledStatus(order.fulfillmentStatus)) return 'fulfilled';
  if (order.closed) return 'closed';
  return order.fulfillmentStatus ?? 'unfulfilled';
}

function isFulfilledStatus(status: string | null) {
  const normalized = (status ?? '').toLowerCase();
  return normalized === 'fulfilled' || normalized === 'shipped' || normalized.includes('fulfill');
}

function parseOptionalDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toShopifyFulfillmentConfirmations(payload: ShopifyOrderPayload) {
  return (payload.fulfillments ?? [])
    .filter((fulfillment) => {
      const status = (fulfillment.status ?? '').toLowerCase();
      return status !== 'cancelled' && status !== 'canceled';
    })
    .map((fulfillment) => {
      const shopifyFulfillmentId = fulfillment.id ? `gid://shopify/Fulfillment/${fulfillment.id}` : null;
      const lines = (fulfillment.line_items ?? [])
        .map((lineItem) => ({
          lineItemId: String(lineItem.id ?? ''),
          quantity: Math.max(0, Number(lineItem.quantity ?? 0)),
        }))
        .filter((line) => line.lineItemId && line.quantity > 0);

      return {
        id: shopifyFulfillmentId ?? crypto.randomUUID(),
        confirmedAt: fulfillment.created_at ?? fulfillment.updated_at ?? null,
        shopifyFulfillmentId,
        shopifyFulfillmentStatus: fulfillment.status ?? null,
        trackingInfo: {
          number: fulfillment.tracking_number ?? '',
          company: fulfillment.tracking_company ?? '',
          url: fulfillment.tracking_url ?? '',
        },
        source: 'shopify_sync',
        lines,
      };
    })
    .filter((fulfillment) => fulfillment.lines.length > 0);
}

function mergeFulfillmentConfirmations(
  currentConfirmations: Array<{ lines: FulfillmentRequestLine[]; shopifyFulfillmentId?: unknown }>,
  syncedConfirmations: Array<{ lines: FulfillmentRequestLine[]; shopifyFulfillmentId: string | null }>
) {
  if (syncedConfirmations.length === 0) return currentConfirmations;

  const syncedIds = new Set(
    syncedConfirmations
      .map((confirmation) => confirmation.shopifyFulfillmentId)
      .filter((id): id is string => typeof id === 'string')
  );

  const currentWithoutSyncedDuplicates = currentConfirmations.filter((confirmation) => {
    return typeof confirmation.shopifyFulfillmentId !== 'string' || !syncedIds.has(confirmation.shopifyFulfillmentId);
  });

  return [...currentWithoutSyncedDuplicates, ...syncedConfirmations];
}

function extractBarcode(lineItems: Array<{ sku: string }>) {
  const firstSku = lineItems.find((item) => item.sku.trim() !== '')?.sku ?? '';
  return firstSku || null;
}

function getPeriodStartDate(period: 'all' | 'week' | 'month' | 'year') {
  const now = new Date();
  if (period === 'all') return null;

  if (period === 'year') {
    return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  }

  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }

  const day = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - day);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function toLineItems(value: Prisma.JsonValue): Array<{ id: string; name: string; sku: string; qty: number }> {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    if (!item || typeof item !== 'object') {
      return { id: '', name: '', sku: '', qty: 0 };
    }

    const obj = item as Record<string, unknown>;
    return {
      id: typeof obj.id === 'string' ? obj.id : String(obj.id ?? ''),
      name: typeof obj.name === 'string' ? obj.name : '',
      sku: typeof obj.sku === 'string' ? obj.sku : '',
      qty: typeof obj.qty === 'number' ? obj.qty : Number(obj.qty ?? 0),
    };
  });
}

function normalizeFulfillmentLines(
  lines: FulfillmentLineInput[],
  orderLines: Array<{ id: string; qty: number }>
): FulfillmentLineInput[] {
  const orderLinesById = new Map(orderLines.map((line) => [line.id, line]));
  const normalized: FulfillmentLineInput[] = [];

  for (const line of lines) {
    const orderLine = orderLinesById.get(line.lineItemId);
    if (!orderLine) {
      throw new Error('Selected line item was not found on this order');
    }

    const quantity = Math.floor(Number(line.quantity));
    if (!Number.isFinite(quantity) || quantity < 1) {
      throw new Error('Selected fulfillment quantities must be at least 1');
    }

    if (quantity > orderLine.qty) {
      throw new Error('Selected fulfillment quantity exceeds the ordered quantity');
    }

    normalized.push({
      lineItemId: line.lineItemId,
      quantity,
      full: Boolean(line.full),
    });
  }

  if (normalized.length === 0) {
    throw new Error('Select at least one line item to fulfill');
  }

  return normalized;
}

function toFulfillmentItems(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { shopifyOrderId: null as string | null, confirmations: [] as Array<{ lines: FulfillmentRequestLine[] }> };
  }

  const obj = value as Record<string, unknown>;
  const confirmations = Array.isArray(obj.confirmations)
    ? obj.confirmations.filter((item): item is { lines: FulfillmentRequestLine[] } => {
        return Boolean(item) && typeof item === 'object' && Array.isArray((item as { lines?: unknown }).lines);
      })
    : [];

  return {
    shopifyOrderId: typeof obj.shopifyOrderId === 'string' ? obj.shopifyOrderId : null,
    confirmations,
  };
}
