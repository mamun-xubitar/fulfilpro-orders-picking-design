import { OrderModel, type FulfillmentLineInput } from '@/models/order.model.server';

const model = new OrderModel();

type Period = 'all' | 'week' | 'month' | 'year';

export class OrderController {
  async list(searchParams: URLSearchParams) {
    const search = searchParams.get('search')?.trim() ?? '';
    const storeIds = searchParams.getAll('storeId').map((s) => s.trim()).filter(Boolean);
    const period = normalizePeriod(searchParams.get('period'));
    const dateFrom = searchParams.get('dateFrom')?.trim() ?? '';
    const dateTo = searchParams.get('dateTo')?.trim() ?? '';
    const fulfillmentStatuses = searchParams.getAll('status').map((s) => s.trim()).filter(Boolean);
    const page = normalizePositiveInt(searchParams.get('page'), 1);
    const pageSize = clamp(normalizePositiveInt(searchParams.get('pageSize'), 20), 5, 100);

    const [result, stores] = await Promise.all([
      model.listForConnectedStores({
        search,
        storeIds,
        period,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        fulfillmentStatuses,
        page,
        pageSize,
      }),
      model.getConnectedStoreOptions(),
    ]);

    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));

    return {
      data: {
        orders: result.orders,
        filters: {
          search,
          storeIds,
          period,
          dateFrom,
          dateTo,
          fulfillmentStatuses,
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

  async confirmFulfillment(orderId: string, body: unknown) {
    const lines = parseFulfillmentLines(body);
    const notifyCustomer = parseNotifyCustomer(body);
    const trackingInfo = parseTrackingInfo(body);
    const barcodes = parseFulfillmentBarcodes(body);
    const fulfillmentDate = parseFulfillmentDate(body);
    const result = await model.confirmFulfillment(orderId, lines, notifyCustomer, trackingInfo, barcodes, fulfillmentDate);

    return {
      data: result,
      message: 'Fulfillment confirmed',
    };
  }

  async getPackingSlipLabel(orderId: string) {
    const label = await model.getPackingSlipLabel(orderId);

    return {
      data: label,
      message: 'Packing slip label retrieved',
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

  async getOrderMessageCenter(orderId: string) {
    const result = await model.getOrderMessageCenter(orderId);

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
    const { adminId, message } = parseAdminOrderMessage(body);
    const result = await model.sendAdminOrderMessage({
      orderId,
      adminId,
      message,
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
    throw new Error('Admin is required');
  }

  if (!message) {
    throw new Error('Message is required');
  }

  if (message.length > 5000) {
    throw new Error('Message must be 5000 characters or fewer');
  }

  return { adminId, message };
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
