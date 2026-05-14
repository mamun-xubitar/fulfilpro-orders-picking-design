import { PickingListModel } from '@/models/picking-list.model.server';

const model = new PickingListModel();

type Actor = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
} | null;

export class PickingListController {
  async list(searchParams: URLSearchParams, allowedStoreIds?: string[] | null) {
    const page = normalizePositiveInt(searchParams.get('page'), 1);
    const pageSize = clamp(normalizePositiveInt(searchParams.get('pageSize'), 20), 5, 100);
    const search = searchParams.get('search')?.trim() ?? '';
    let storeIds = searchParams.getAll('storeId').map((value) => value.trim()).filter(Boolean);
    const period = normalizePeriod(searchParams.get('period'));
    const dateFrom = searchParams.get('dateFrom')?.trim() ?? '';
    const dateTo = searchParams.get('dateTo')?.trim() ?? '';
    const packedStatuses = searchParams.getAll('packedStatus').map((value) => value.trim()).filter(Boolean);
    const printStatuses = searchParams.getAll('printStatus').map((value) => value.trim()).filter(Boolean);

    if (allowedStoreIds !== null && allowedStoreIds !== undefined) {
      if (allowedStoreIds.length === 0) {
        return {
          data: {
            orders: [],
            filters: {
              search,
              storeIds,
              period,
              dateFrom,
              dateTo,
              packedStatuses,
              printStatuses,
            },
            stores: [],
            recipients: await model.listRecipients(),
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

    const result = await model.list({
      search,
      storeIds,
      period,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      packedStatuses,
      printStatuses,
      page,
      pageSize,
      allowedStoreIds,
    });
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
          packedStatuses,
          printStatuses,
        },
        stores: result.stores,
        recipients: await model.listRecipients(),
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

  async confirmPacked(orderId: string, body: unknown, actor: Actor, originUrl?: string) {
    const parsed = parsePackingBody(body);
    const result = await model.confirmPacked({
      orderId,
      lines: parsed.lines,
      notifyUserIds: parsed.notifyUserIds,
      notifyMessage: parsed.notifyMessage,
      actor,
      originUrl,
    });
    return { data: result, message: 'Packed quantities confirmed' };
  }

  async cancelPacked(orderId: string, confirmationId: string, body: unknown, actor: Actor, originUrl?: string) {
    const parsed = parseNotifyBody(body);
    const result = await model.cancelPacked({
      orderId,
      confirmationId,
      notifyUserIds: parsed.notifyUserIds,
      notifyMessage: parsed.notifyMessage,
      actor,
      originUrl,
    });
    return { data: result, message: 'Packed confirmation canceled' };
  }

  async recordPrints(body: unknown, actor: Actor) {
    const orders = parsePrintBody(body);
    const result = await model.recordPrints({ orders, actor });
    return { data: result, message: 'Picking slip print recorded' };
  }

  async refreshOrder(orderId: string) {
    const result = await model.refreshFromShopify(orderId);
    return { data: result, message: 'Order refreshed' };
  }
}

function parsePackingBody(body: unknown) {
  if (!body || typeof body !== 'object') throw new Error('Packing data is required');
  const value = body as Record<string, unknown>;
  const lines = Array.isArray(value.lines)
    ? value.lines.map((line) => {
      const item = line && typeof line === 'object' ? line as Record<string, unknown> : {};
      return {
        lineItemId: typeof item.lineItemId === 'string' ? item.lineItemId.trim() : '',
        quantity: Number(item.quantity ?? 0),
        full: Boolean(item.full),
      };
    }).filter((line) => line.lineItemId && line.quantity > 0)
    : [];
  const notify = parseNotifyBody(body);

  if (lines.length === 0) throw new Error('Select at least one item quantity to pack');
  return { lines, ...notify };
}

function parseNotifyBody(body: unknown) {
  const value = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const notifyUserIds = Array.isArray(value.notifyUserIds)
    ? value.notifyUserIds.map((id) => String(id ?? '').trim()).filter(Boolean)
    : [];
  const notifyMessage = typeof value.notifyMessage === 'string' ? value.notifyMessage.trim() : '';

  if (notifyMessage.length > 5000) throw new Error('Message must be 5000 characters or fewer');
  return { notifyUserIds, notifyMessage };
}

function parsePrintBody(body: unknown) {
  if (!body || typeof body !== 'object') throw new Error('Print data is required');
  const value = body as Record<string, unknown>;
  if (!Array.isArray(value.orders)) throw new Error('orders must be an array');
  return value.orders.map((order) => {
    const item = order && typeof order === 'object' ? order as Record<string, unknown> : {};
    const orderId = typeof item.orderId === 'string' ? item.orderId.trim() : '';
    const items = Array.isArray(item.items) ? item.items : [];
    if (!orderId) throw new Error('orderId is required');
    return { orderId, items };
  });
}

function normalizePeriod(value: string | null): 'all' | 'week' | 'month' | 'year' {
  return value === 'week' || value === 'month' || value === 'year' ? value : 'all';
}

function normalizePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
