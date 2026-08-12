import { OrderModel, type FulfillmentLineInput } from '@/models/order.model.server';
import { ProductModel } from '@/models/product.model.server';
import { enqueueJob } from '@/lib/background-jobs.server';
import prisma from '@/lib/prisma.server';
import { getDecorationCrossVisibility } from '@/lib/decoration-visibility.server';

const model = new OrderModel();
const productModel = new ProductModel();

type Period = 'all' | 'week' | 'month' | 'year';

const SEARCH_FIELD_VALUES = new Set(['number', 'customer', 'address', 'lineItem']);
const SORTABLE_ORDER_FIELDS = new Set(['number', 'customer', 'orderedAt']);

export class OrderController {
  async list(searchParams: URLSearchParams, viewerId?: string, allowedStoreIds?: string[] | null, viewerRole?: string) {
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
    const decorationView = searchParams.get('decorationView') === '1';
    const sortParam = searchParams.get('sort');
    const sort = sortParam && SORTABLE_ORDER_FIELDS.has(sortParam) ? (sortParam as 'number' | 'customer' | 'orderedAt') : undefined;
    const dir = searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
    const crossDecorationVisibility = await getDecorationCrossVisibility();

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
            crossDecorationVisibility,
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
        viewerRole,
        decorationView,
        crossDecorationVisibility,
        page,
        pageSize,
        sort,
        dir,
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
        crossDecorationVisibility,
      },
    };
  }

  async listNameAttributes(searchParams: URLSearchParams, viewerId?: string, allowedStoreIds?: string[] | null, viewerRole?: string) {
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
    const decorationView = searchParams.get('decorationView') === '1';

    if (allowedStoreIds !== null && allowedStoreIds !== undefined) {
      if (allowedStoreIds.length === 0) {
        return { data: { attributes: [], count: 0 } };
      }
      storeIds = storeIds.length > 0 ? storeIds.filter((id) => allowedStoreIds.includes(id)) : allowedStoreIds;
    }

    const crossDecorationVisibility = await getDecorationCrossVisibility();

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
      viewerRole,
      decorationView,
      crossDecorationVisibility,
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

  async enqueueDecorationRescan() {
    const existing = await prisma.backgroundJob.findFirst({
      where: { type: 'rescan_decorations', status: { in: ['queued', 'running'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return { data: { job: existing, alreadyRunning: true }, message: 'Decoration re-scan already running' };
    }

    const job = await enqueueJob('rescan_decorations');
    return { data: { job, alreadyRunning: false }, message: 'Decoration re-scan queued' };
  }

  async getDecorationRescanStatus() {
    const jobs = await prisma.backgroundJob.findMany({
      where: { type: 'rescan_decorations' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const activeJob = jobs.find((j) => j.status === 'queued' || j.status === 'running') ?? null;
    const lastSuccessfulJob = jobs.find((j) => j.status === 'completed') ?? null;
    const latestJob = jobs[0] ?? null;

    return { data: { activeJob, lastSuccessfulJob, latestJob } };
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

  async deleteLineItem(
    orderId: string,
    lineItemId: string,
    body: unknown,
    admin: { id?: string | null; name?: string | null; email?: string | null }
  ) {
    const { restock } = parseDeleteLineItemInput(body);
    const result = await model.deleteShopifyLineItem(orderId, lineItemId, {
      restock,
      actorName: actorName(admin),
    });

    return {
      data: result.row,
      message: withWarning('Line item removed', result.warningMessage),
    };
  }

  async updateLineItem(
    orderId: string,
    lineItemId: string,
    body: unknown,
    admin: { id?: string | null; name?: string | null; email?: string | null }
  ) {
    const parsed = parseUpdateLineItemInput(body);
    const result = await model.updateShopifyLineItem(orderId, lineItemId, {
      ...parsed,
      actorName: actorName(admin),
    });

    return {
      data: result.row,
      message: withWarning('Line item updated', result.warningMessage),
    };
  }

  async addLineItem(
    orderId: string,
    body: unknown,
    admin: { id?: string | null; name?: string | null; email?: string | null }
  ) {
    const parsed = parseAddLineItemInput(body);
    const result = await model.addShopifyLineItem(orderId, {
      ...parsed,
      actorName: actorName(admin),
    });

    return {
      data: result.row,
      message: withWarning('Line item added', result.warningMessage),
    };
  }

  async getPresentmentCurrency(orderId: string) {
    return model.getPresentmentCurrency(orderId);
  }

  async searchStoreVariants(orderId: string, query: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { storeId: true } });
    if (!order) {
      throw new Error('Order not found');
    }

    const results = await productModel.searchVariantsForStore({ storeId: order.storeId, query });

    return { data: results };
  }
}

function actorName(admin: { name?: string | null; email?: string | null }) {
  return admin.name?.trim() || admin.email?.trim() || 'Admin';
}

function withWarning(message: string, warning?: string) {
  return warning ? `${message}. ${warning}` : message;
}

function parseDeleteLineItemInput(body: unknown) {
  const value = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  return { restock: value.restock !== false };
}

function parseUpdateLineItemInput(body: unknown) {
  if (!body || typeof body !== 'object') {
    throw new Error('Line item data is required');
  }

  const value = body as Record<string, unknown>;
  const quantity = Number(value.quantity);
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error('Quantity must be zero or greater');
  }

  const title = typeof value.title === 'string' ? value.title : undefined;
  const restock = typeof value.restock === 'boolean' ? value.restock : undefined;

  return { quantity, title, restock };
}

function parseAddLineItemInput(body: unknown) {
  if (!body || typeof body !== 'object') {
    throw new Error('Line item data is required');
  }

  const value = body as Record<string, unknown>;
  const mode = value.mode === 'custom' ? 'custom' as const : value.mode === 'variant' ? 'variant' as const : null;
  if (!mode) {
    throw new Error("mode must be either 'variant' or 'custom'");
  }

  const quantity = Number(value.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Quantity must be greater than zero');
  }

  const afterLineItemId = typeof value.afterLineItemId === 'string' ? value.afterLineItemId : undefined;

  if (mode === 'variant') {
    const variantId = typeof value.variantId === 'string' ? value.variantId.trim() : '';
    if (!variantId) {
      throw new Error('A variant must be selected');
    }
    return { mode, variantId, quantity, afterLineItemId };
  }

  const title = typeof value.title === 'string' ? value.title.trim() : '';
  if (!title) {
    throw new Error('Title is required');
  }

  const price = typeof value.price === 'string' ? value.price.trim() : '';
  if (!price || Number(price) < 0) {
    throw new Error('Price must be zero or greater');
  }

  return { mode, title, price, quantity, afterLineItemId };
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
