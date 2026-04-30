import { OrderModel, type FulfillmentLineInput } from '@/models/order.model.server';

const model = new OrderModel();

type Period = 'all' | 'week' | 'month' | 'year';

export class OrderController {
  async list(searchParams: URLSearchParams) {
    const search = searchParams.get('search')?.trim() ?? '';
    const storeId = searchParams.get('storeId')?.trim() ?? '';
    const period = normalizePeriod(searchParams.get('period'));
    const page = normalizePositiveInt(searchParams.get('page'), 1);
    const pageSize = clamp(normalizePositiveInt(searchParams.get('pageSize'), 20), 5, 100);

    const [result, stores] = await Promise.all([
      model.listForConnectedStores({
        search,
        storeId: storeId || undefined,
        period,
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
          storeId,
          period,
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
    const result = await model.confirmFulfillment(orderId, lines, notifyCustomer, trackingInfo, barcodes);

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
