import { PickingListModel } from '@/models/picking-list.model.server';
import { OrderModel } from '@/models/order.model.server';
import { shapeOrderForRole } from '@/lib/order-row-shape.server';
import { isOrderPickerRole } from '@/lib/roles';

const model = new PickingListModel();
const orderModel = new OrderModel();

/** The merged Orders page shows the updated order in its own row shape. */
async function loadOrderRow(orderId: string, viewerRole?: string) {
  const row = await orderModel.getOrderRow(orderId, isOrderPickerRole(viewerRole) ? 'picker' : 'orders');
  return { order: shapeOrderForRole(row, viewerRole) };
}

type Actor = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
} | null;

export class PickingListController {
  async confirmPacked(orderId: string, body: unknown, actor: Actor, originUrl?: string, viewerRole?: string) {
    const parsed = parsePackingBody(body);
    await model.confirmPacked({
      orderId,
      lines: parsed.lines,
      notifyUserIds: parsed.notifyUserIds,
      notifyMessage: parsed.notifyMessage,
      actor,
      originUrl,
    });
    return { data: await loadOrderRow(orderId, viewerRole), message: 'Packed quantities confirmed' };
  }

  async cancelPacked(orderId: string, confirmationId: string, body: unknown, actor: Actor, originUrl?: string, viewerRole?: string) {
    const parsed = parseNotifyBody(body);
    await model.cancelPacked({
      orderId,
      confirmationId,
      notifyUserIds: parsed.notifyUserIds,
      notifyMessage: parsed.notifyMessage,
      actor,
      originUrl,
    });
    return { data: await loadOrderRow(orderId, viewerRole), message: 'Packed confirmation canceled' };
  }

  async recordPrints(body: unknown, actor: Actor) {
    const orders = parsePrintBody(body);
    const result = await model.recordPrints({ orders, actor });
    return { data: result, message: 'Picking slip print recorded' };
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
