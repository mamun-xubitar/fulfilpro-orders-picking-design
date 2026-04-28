import prisma from '@/lib/prisma.server';
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

    const lineItems = (payload.line_items ?? []).map((item) => ({
      name: item.name ?? '',
      sku: item.sku ?? '',
      qty: Number(item.quantity ?? 0),
      price: Number(item.price_set?.shop_money?.amount ?? 0),
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
    const priceRaw = payload.total_price_set?.shop_money?.amount ?? payload.total_price ?? 0;
    const price = Number(priceRaw);
    const currencyCode = payload.total_price_set?.shop_money?.currency_code ?? null;

    await prisma.order.create({
      data: {
        number: `${payload.order_number}`,
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
        boarcode: extractBarcode(lineItems),
        lineItems,
        price: Number.isFinite(price) ? price : 0,
        currencyCode,
        storeId,
        orderedAt: new Date(payload.created_at)
      },
    });

    return { created: true };
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
        orderBy: { createdAt: 'desc' },
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
        customerEmail: row.cusEmail,
        address: row.address,
        address2: row.address2,
        city: row.city,
        state: row.state,
        country: row.country,
        status: row.fulfillmentStatus ?? 'unfulfilled',
        orderedAt: row.createdAt.toISOString(),
        storeId: row.store.id,
        storeName: row.store.name ?? row.store.storeDomain,
        storeDomain: row.store.storeDomain,
        items: lineItems,
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
}

function resolveFulfillmentStatus(payloadStatus?: string | null) {
  const normalized = (payloadStatus ?? '').toLowerCase();
  if (normalized.includes('partial')) return 'partial';
  if (normalized.includes('fulfill')) return 'fulfilled';
  return normalized || 'unfulfilled';
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

function toLineItems(value: Prisma.JsonValue): Array<{ name: string; sku: string; qty: number }> {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    if (!item || typeof item !== 'object') {
      return { name: '', sku: '', qty: 0 };
    }

    const obj = item as Record<string, unknown>;
    return {
      name: typeof obj.name === 'string' ? obj.name : '',
      sku: typeof obj.sku === 'string' ? obj.sku : '',
      qty: typeof obj.qty === 'number' ? obj.qty : Number(obj.qty ?? 0),
    };
  });
}
