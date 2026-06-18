import { OrderModel, type FulfillmentLineInput } from '@/models/order.model.server';

const model = new OrderModel();

type Period = 'all' | 'week' | 'month' | 'year';

const SEARCH_FIELD_VALUES = new Set(['number', 'customer', 'address', 'lineItem']);

export class OrderController {
  async list(searchParams: URLSearchParams, viewerId?: string, allowedStoreIds?: string[] | null) {
    const search = searchParams.get('search')?.trim() ?? '';
    const searchField = SEARCH_FIELD_VALUES.has(searchParams.get('searchField')?.trim() ?? '')
      ? searchParams.get('searchField')!.trim()
      : '';
    let storeIds = searchParams.getAll('storeId').map((s) => s.trim()).filter(Boolean);
    const period = normalizePeriod(searchParams.get('period'));
    const dateFrom = searchParams.get('dateFrom')?.trim() ?? '';
    const dateTo = searchParams.get('dateTo')?.trim() ?? '';
    const fulfillmentStatuses = searchParams.getAll('status').map((s) => s.trim()).filter(Boolean);
    const packingStatuses = searchParams.getAll('packingStatus').map((s) => s.trim()).filter(Boolean);
    const page = normalizePositiveInt(searchParams.get('page'), 1);
    const pageSize = clamp(normalizePositiveInt(searchParams.get('pageSize'), 20), 5, 100);

    if (allowedStoreIds !== null && allowedStoreIds !== undefined) {
      if (allowedStoreIds.length === 0) {
        return {
          data: {
            orders: [],
            filters: {
              search,
              searchField,
              storeIds,
              period,
              dateFrom,
              dateTo,
              fulfillmentStatuses,
              packingStatuses,
            },
            stores: [],
            pagination: {
              page,
              pageSize,
              total: 0,
              totalPages: 1,
              hasPrev: false,
              hasNext: false,
            },
          },
        };
      }
      storeIds = storeIds.length > 0 ? storeIds.filter((id) => allowedStoreIds.includes(id)) : allowedStoreIds;
    }

    const [result, stores] = await Promise.all([
      model.listForConnectedStores({
        search,
        searchField,
        storeIds,
        period,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        fulfillmentStatuses,
        packingStatuses,
        viewerId,
        page,
        pageSize,
      }),
      model.getConnectedStoreOptions(allowedStoreIds),
    ]);

    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));

    return {
      data: {
        orders: result.orders,
        filters: {
          search,
          searchField,
          storeIds,
          period,
          dateFrom,
          dateTo,
          fulfillmentStatuses,
          packingStatuses,
        },
        stores,
        pagination: {
          page,
          pageSize,
          total: result.total,
          totalPages,
          hasPrev: page > 1,
          hasNext: page < totalPages,
        },
      },
    };
  }

  async listNameAttributes(searchParams: URLSearchParams, viewerId?: string, allowedStoreIds?: string[] | null) {
    const search = searchParams.get('search')?.trim() ?? '';
    const searchField = SEARCH_FIELD_VALUES.has(searchParams.get('searchField')?.trim() ?? '')
      ? searchParams.get('searchField')!.trim()
      : '';
    let storeIds = searchParams.getAll('storeId').map((s) => s.trim()).filter(Boolean);
    const period = normalizePeriod(searchParams.get('period'));
    const dateFrom = searchParams.get('dateFrom')?.trim() ?? '';
    const dateTo = searchParams.get('dateTo')?.trim() ?? '';
    const fulfillmentStatuses = searchParams.getAll('status').map((s) => s.trim()).filter(Boolean);
    const packingStatuses = searchParams.getAll('packingStatus').map((s) => s.trim()).filter(Boolean);

    if (allowedStoreIds !== null && allowedStoreIds !== undefined) {
      if (allowedStoreIds.length === 0) {
        return { data: { attributes: [], count: 0 } };
      }
      storeIds = storeIds.length > 0 ? storeIds.filter((id) => allowedStoreIds.includes(id)) : allowedStoreIds;
    }

    const result = await model.listNameAttributesForFilters({
      search,
      searchField,
      storeIds,
      period,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      fulfillmentStatuses,
      packingStatuses,
      viewerId,
    });

    return { data: result };
  }

  async confirmFulfillment(orderId: string, body: unknown, originUrl?: string) {
    const lines = parseFulfillmentLines(body);
    const notifyCustomer = parseNotifyCustomer(body);
    const trackingInfo = parseTrackingInfo(body);
    const barcodes = parseFulfillmentBarcodes(body);
    const fulfillmentDate = parseFulfillmentDate(body);
    const result = await model.confirmFulfillment(orderId, lines, notifyCustomer, trackingInfo, barcodes, fulfillmentDate, originUrl);

    return {
      data: result,
      message: 'Fulfillment confirmed',
    };
  }

  async setLineItemDecoration(orderId: string, lineItemId: string, body: unknown) {
    const flags = parseDecorationFlags(body);
    const result = await model.setLineItemDecoration(orderId, lineItemId, flags);

    return {
      data: result,
      message: 'Decoration updated',
    };
  }

  async getStockAdjustment(orderId: string) {
    const result = await model.getStockAdjustment(orderId);

    return {
      data: result,
      message: 'Stock adjustment retrieved',
    };
  }

  async updateStockAdjustment(
    orderId: string,
    body: unknown,
    admin: {
      id?: string | null;
      name?: string | null;
      email?: string | null;
    }
  ) {
    const parsed = parseStockAdjustmentUpdate(body);
    const result = await model.updateStockAdjustment({
      orderId,
      managedLineItemIds: parsed.managedLineItemIds,
      note: parsed.note,
      admin,
    });

    return {
      data: result,
      message: 'Stock adjustment updated',
    };
  }

  async getPackingSlipLabel(orderId: string) {
    const label = await model.getPackingSlipLabel(orderId);

    return {
      data: label,
      message: 'Packing slip label retrieved',
    };
  }

  async refreshOrder(orderId: string) {
    const result = await model.refreshFromShopify(orderId);

    return {
      data: result,
      message: 'Order refreshed',
    };
  }

  async saveBarcodes(orderId: string, body: unknown) {
    const barcodes = parseBarcodes(body);
    const result = await model.saveBarcodes(orderId, barcodes);

    return {
      data: result,
      message: 'Barcodes saved',
    };
  }

  async getOrderMessageCenter(orderId: string, typeInput?: string | null) {
    const type = parseOrderMessageType(typeInput, true);
    const result = await model.getOrderMessageCenter(orderId, type);

    return {
      data: result,
      message: 'Order messages retrieved',
    };
  }

  async sendAdminOrderMessage(
    orderId: string,
    body: unknown,
    sender?: {
      id?: string | null;
      name?: string | null;
      email?: string | null;
    } | null
  ) {
    const { adminId, message, type } = parseAdminOrderMessage(body);
    const result = await model.sendAdminOrderMessage({
      orderId,
      adminId,
      message,
      type,
      sender,
    });

    return {
      data: result,
      message: 'Message sent',
    };
  }

  async listOrderNotes(orderId: string) {
    const result = await model.listOrderNotes(orderId);

    return {
      data: result,
      message: 'Order notes retrieved',
    };
  }

  async createOrderNote(
    orderId: string,
    body: unknown,
    user?: {
      id?: string | null;
      name?: string | null;
      email?: string | null;
    } | null
  ) {
    const note = parseOrderNote(body);
    const result = await model.createOrderNote({ orderId, note, user });

    return {
      data: result,
      message: 'Note added',
    };
  }

  async updateOrderNote(
    orderId: string,
    noteId: string,
    body: unknown,
    user?: {
      id?: string | null;
      name?: string | null;
      email?: string | null;
    } | null
  ) {
    const note = parseOrderNote(body);
    const result = await model.updateOrderNote({ orderId, noteId, note, user });

    return {
      data: result,
      message: 'Note updated',
    };
  }

  async deleteOrderNote(orderId: string, noteId: string) {
    const result = await model.deleteOrderNote(orderId, noteId);

    return {
      data: result,
      message: 'Note deleted',
    };
  }
}

function parseDecorationFlags(body: unknown) {
  if (!body || typeof body !== 'object') {
    throw new Error('Decoration data is required');
  }

  const value = body as Record<string, unknown>;
  if (typeof value.isEmbroidery !== 'boolean' || typeof value.isPrint !== 'boolean') {
    throw new Error('isEmbroidery and isPrint must be booleans');
  }

  return { isEmbroidery: value.isEmbroidery, isPrint: value.isPrint };
}

function parseOrderNote(body: unknown) {
  if (!body || typeof body !== 'object') {
    throw new Error('Note data is required');
  }

  const value = body as Record<string, unknown>;
  const note = typeof value.note === 'string' ? value.note.trim() : '';

  if (!note) {
    throw new Error('Note is required');
  }

  if (note.length > 5000) {
    throw new Error('Note must be 5000 characters or fewer');
  }

  return note;
}

function parseAdminOrderMessage(body: unknown) {
  if (!body || typeof body !== 'object') {
    throw new Error('Message data is required');
  }

  const value = body as Record<string, unknown>;
  const adminId = typeof value.adminId === 'string' ? value.adminId.trim() : '';
  const message = typeof value.message === 'string' ? value.message.trim() : '';

  if (!adminId) {
    throw new Error('Recipient is required');
  }

  if (!message) {
    throw new Error('Message is required');
  }

  if (message.length > 5000) {
    throw new Error('Message must be 5000 characters or fewer');
  }

  const type = parseOrderMessageType(value.type, true);

  return { adminId, message, type };
}

function parseOrderMessageType(value: unknown, defaultToOrders: boolean): 'orders' | 'picker' {
  if (value == null && defaultToOrders) return 'orders';
  const type = typeof value === 'string' ? value.trim() : '';
  if (type === 'orders' || type === 'picker') return type;
  throw new Error("type must be either 'orders' or 'picker'");
}

function parseBarcodes(body: unknown) {
  if (!body || typeof body !== 'object' || !Array.isArray((body as { barcodes?: unknown }).barcodes)) {
    throw new Error('Barcodes are required');
  }

  return (body as { barcodes: unknown[] }).barcodes.map((barcode) => String(barcode ?? ''));
}

function parseFulfillmentBarcodes(body: unknown) {
  if (!body || typeof body !== 'object') return [];
  const value = (body as { barcodes?: unknown }).barcodes;
  if (!Array.isArray(value)) return [];

  return value.map((barcode) => String(barcode ?? ''));
}

function parseFulfillmentDate(body: unknown) {
  if (!body || typeof body !== 'object') return null;
  const value = (body as { fulfillmentDate?: unknown }).fulfillmentDate;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error('Fulfillment date must be a valid date');
  }

  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== trimmed) {
    throw new Error('Fulfillment date must be a valid date');
  }

  return trimmed;
}

function parseTrackingInfo(body: unknown) {
  if (!body || typeof body !== 'object') return null;
  const value = (body as { trackingInfo?: unknown }).trackingInfo;
  if (!value || typeof value !== 'object') return null;

  const obj = value as Record<string, unknown>;
  const trackingInfo = {
    number: typeof obj.number === 'string' && obj.number.trim() !== "" ? obj.number.trim() : undefined,
    url: typeof obj.url === 'string' && obj.url.trim() !== "" ? obj.url.trim() : undefined,
    company: typeof obj.company === 'string' && obj.company.trim() !== "" ? obj.company.trim() : undefined,
  };

  if (!trackingInfo.number && !trackingInfo.url && !trackingInfo.company) return null;
  if (trackingInfo.url && !trackingInfo.number) {
    throw new Error('Tracking number is required when a tracking URL is provided');
  }
  return trackingInfo;
}

function parseNotifyCustomer(body: unknown) {
  if (!body || typeof body !== 'object') return true;
  const value = (body as { notifyCustomer?: unknown }).notifyCustomer;
  return typeof value === 'boolean' ? value : true;
}

function parseStockAdjustmentUpdate(body: unknown) {
  if (!body || typeof body !== 'object') {
    throw new Error('Stock adjustment data is required');
  }

  const value = body as Record<string, unknown>;
  const managedLineItemIds = Array.isArray(value.managedLineItemIds)
    ? value.managedLineItemIds.map((id) => String(id ?? '').trim()).filter(Boolean)
    : [];
  const note = typeof value.note === 'string' ? value.note.trim() : '';

  if (note.length > 2000) {
    throw new Error('Note must be 2000 characters or fewer');
  }

  return { managedLineItemIds, note };
}

function parseFulfillmentLines(body: unknown): FulfillmentLineInput[] {
  if (!body || typeof body !== 'object' || !Array.isArray((body as { lines?: unknown }).lines)) {
    throw new Error('Fulfillment lines are required');
  }

  return (body as { lines: unknown[] }).lines.map((line) => {
    if (!line || typeof line !== 'object') {
      throw new Error('Invalid fulfillment line item');
    }

    const item = line as Record<string, unknown>;
    return {
      lineItemId: String(item.lineItemId ?? ''),
      quantity: Number(item.quantity ?? 0),
      full: Boolean(item.full),
    };
  });
}

function normalizePeriod(value: string | null): Period {
  if (value === 'week' || value === 'month' || value === 'year') return value;
  return 'all';
}

function normalizePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
