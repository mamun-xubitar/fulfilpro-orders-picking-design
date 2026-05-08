import {
  BackInStockModel,
  type BackInStockItemInput,
} from '@/models/back-in-stock.model.server';

const model = new BackInStockModel();

export class BackInStockController {
  async list(searchParams: URLSearchParams, viewer: { id: string; role: string }) {
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || '20')));
    const search = searchParams.get('search') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const requesterId = viewer.role === 'admin' ? searchParams.get('requesterId') ?? undefined : viewer.id;

    const result = await model.list({ search, status, requesterId, page, pageSize });
    return {
      data: {
        requests: result.requests,
        pagination: buildPagination(result.total, page, pageSize),
      },
      message: 'Back in stock requests loaded',
    };
  }

  async listForOrder(orderId: string, viewer: { id: string; role: string }) {
    const result = await model.listForOrder(orderId, viewer.id, viewer.role === 'admin');
    return { data: result, message: 'Back in stock requests loaded' };
  }

  async create(body: unknown, requester: { id: string; name: string; email: string }) {
    const parsed = parseCreate(body);
    const result = await model.create({
      orderId: parsed.orderId,
      requester,
      items: parsed.items,
      message: parsed.message,
    });
    return { data: result, message: 'Back in stock request submitted' };
  }

  async adminUpdate(requestId: string, body: unknown, admin: { id: string; name: string; email: string; role: string }) {
    const parsed = parseAdminUpdate(body);
    const result = await model.adminUpdate({
      requestId,
      admin,
      items: parsed.items,
      message: parsed.message,
    });
    return { data: result, message: 'Back in stock request updated' };
  }
}

function parseCreate(body: unknown) {
  if (!body || typeof body !== 'object') throw new Error('Request body is required');
  const v = body as Record<string, unknown>;
  const orderId = typeof v.orderId === 'string' ? v.orderId.trim() : '';
  const message = typeof v.message === 'string' ? v.message.trim() : '';
  const items = Array.isArray(v.items) ? v.items.map(parseItem) : [];

  if (!orderId) throw new Error('orderId is required');
  if (items.length === 0) throw new Error('Add at least one product detail');
  if (message.length > 2000) throw new Error('Message must be 2000 characters or fewer');

  return { orderId, items, message };
}

function parseItem(value: unknown): BackInStockItemInput {
  if (!value || typeof value !== 'object') throw new Error('Invalid product detail');
  const v = value as Record<string, unknown>;
  const lineItemId = typeof v.lineItemId === 'string' ? v.lineItemId.trim() : '';
  const dueDate = typeof v.dueDate === 'string' ? v.dueDate.trim() : '';
  const supplierName = typeof v.supplierName === 'string' ? v.supplierName.trim() : '';
  const item = typeof v.item === 'string' ? v.item.trim() : '';
  const quantity = Number(v.quantity);

  if (!lineItemId) throw new Error('Item is required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error('Due date is required');
  if (!supplierName) throw new Error('Supplier name is required');
  if (!item) throw new Error('Item is required');
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantity must be greater than zero');
  if (supplierName.length > 200) throw new Error('Supplier name must be 200 characters or fewer');
  if (item.length > 500) throw new Error('Item must be 500 characters or fewer');

  return { lineItemId, dueDate, supplierName, quantity, item };
}

function parseAdminUpdate(body: unknown): { items?: Array<{ lineItemId: string; restockedQuantity: number }>; message: string } {
  if (!body || typeof body !== 'object') throw new Error('Request body is required');
  const v = body as Record<string, unknown>;
  const message = typeof v.message === 'string' ? v.message.trim() : '';
  const items = Array.isArray(v.items) ? v.items.map(parseRestockedItem) : undefined;

  if (!message && (!items || items.length === 0)) throw new Error('Message or restocked quantity is required');
  if (message.length > 2000) throw new Error('Message must be 2000 characters or fewer');

  return { items, message };
}

function parseRestockedItem(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('Invalid restocked item');
  const v = value as Record<string, unknown>;
  const lineItemId = typeof v.lineItemId === 'string' ? v.lineItemId.trim() : '';
  const restockedQuantity = Number(v.restockedQuantity);

  if (!lineItemId) throw new Error('Item is required');
  if (!Number.isFinite(restockedQuantity) || restockedQuantity < 0) throw new Error('Restocked quantity must be zero or greater');

  return { lineItemId, restockedQuantity };
}

function buildPagination(total: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}
