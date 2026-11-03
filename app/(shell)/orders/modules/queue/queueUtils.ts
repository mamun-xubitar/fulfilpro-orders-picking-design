import { resolveSwatch } from '@/lib/inventory/colour';
import type { OrderItem, OrderRow } from '../types';
import { getFulfilledQty, isOrderFullyFulfilled } from '../utils';
import { getLineShortfall } from '../hooks/useCreatePo';
import type { OrderCapabilities } from '../capabilities';

const optionValue = (item: OrderItem, pattern: RegExp) => item.variantOptions?.find((o) => pattern.test(o.name))?.value?.trim() ?? '';

export const getItemColour = (item: OrderItem) => optionValue(item, /^colou?r$/i);
export const getItemSize = (item: OrderItem) => optionValue(item, /^size$/i);
export const getSwatchColour = (colour: string) => resolveSwatch(colour);

/** Variant text without the colour, which has its own swatch (e.g. "M / Cotton"). */
export function getOtherOptions(item: OrderItem) {
  const options = (item.variantOptions ?? []).filter((o) => !/^colou?r$/i.test(o.name) && o.value && o.value !== 'Default Title');
  return options.map((o) => o.value).join(' · ');
}

/** Shopify admin page of the product behind a line: https://{store}/admin/products/{id}. */
export function getShopifyAdminUrl(order: Pick<OrderRow, 'storeDomain'>, item: Pick<OrderItem, 'productId'>) {
  const id = item.productId ? String(item.productId).split('/').pop() : '';
  if (!id || !order.storeDomain) return null;
  return `https://${order.storeDomain}/admin/products/${id}`;
}

export const getThumbnailUrl = (url: string, size = 48) => {
  try {
    const u = new URL(url);
    u.searchParams.set('width', String(size));
    u.searchParams.set('height', String(size));
    u.searchParams.set('crop', 'center');
    return u.toString();
  } catch {
    return url;
  }
};

export type StageState = 'none' | 'part' | 'done';
export type StageNode = { key: 'slip' | 'pack' | 'ful' | 'trk'; label: string; state: StageState };

/** Stage track nodes for a row; each role only sees the stages it works with. */
export function getStageNodes(order: OrderRow, caps: OrderCapabilities): StageNode[] {
  const nodes: StageNode[] = [];
  if (caps.slip) nodes.push({ key: 'slip', label: 'Slip', state: order.slipPrinted ? 'done' : 'none' });
  nodes.push({ key: 'pack', label: 'Pack', state: order.packingStatus === 'packed' ? 'done' : order.packingStatus === 'partially_packed' ? 'part' : 'none' });
  if (caps.fulfilment) {
    const fulfilled = isOrderFullyFulfilled(order);
    const some = order.fulfillmentItems.confirmations.length > 0;
    nodes.push({ key: 'ful', label: 'Fulfil', state: fulfilled ? 'done' : some ? 'part' : 'none' });
    const t = order.trackings?.[0];
    nodes.push({ key: 'trk', label: 'Track', state: t?.status === 'Delivered' ? 'done' : t ? 'part' : 'none' });
  }
  return nodes;
}

/** Row background by status: canceled, closed, back in stock, pending request, then fulfilment / packing / decoration. */
export function getRowTone(order: OrderRow, caps: OrderCapabilities) {
  const fulfilled = isOrderFullyFulfilled(order);
  if (order.canceled) return 'bg-orders-tone-canceled hover:brightness-95';
  if (order.closed) return 'bg-orders-tone-closed hover:brightness-95';
  if (caps.requestStock && order.backInStockStatus && !fulfilled) return 'bg-orders-tone-restock hover:brightness-95';
  if (order.status === 'fulfilled' || order.status === 'shipped') return 'bg-orders-tone-fulfilled hover:brightness-95';
  if (order.status === 'partial' || order.status === 'partially_fulfilled') return 'bg-orders-tone-partial hover:brightness-95';
  if (order.packingStatus === 'packed') return 'bg-orders-tone-packed hover:brightness-95';
  if (caps.decoration && order.items.some((i) => i.isEmbroidery)) return 'bg-orders-emb-soft hover:brightness-95';
  if (caps.decoration && order.items.some((i) => i.isPrint)) return 'bg-orders-prt-soft hover:brightness-95';
  return 'bg-orders-surface hover:bg-orders-surface-muted';
}

/** Grid columns of the queue table; the same template is used by the header and every row. */
export function getGridColumns(caps: OrderCapabilities) {
  const cols = ['28px', '92px'];
  if (caps.store) cols.push('64px');
  cols.push('minmax(120px,1fr)');
  if (caps.admin) cols.push('58px');
  cols.push('96px');
  cols.push(`${(caps.slip ? 1 : 0) * 34 + 34 + (caps.fulfilment ? 68 : 0) + 8}px`);
  if (caps.fulfilment) cols.push('150px');
  cols.push('96px');
  if (caps.decoration || caps.packedDate) cols.push('88px');
  cols.push('52px');
  cols.push(caps.admin ? '196px' : caps.pack && !caps.fulfilment ? '124px' : '168px');
  return cols.join(' ');
}

/** Pieces of a line the hub cannot cover yet (0 when covered, locked, or the product is not in the hub). */
export function getItemShortfall(order: OrderRow, item: OrderItem) {
  if (!item.inventory || order.canceled || order.closed) return 0;
  const remaining = Math.max(0, item.qty - getFulfilledQty(order, item.id));
  return getLineShortfall(remaining, item.inventory);
}

export const countShortLines = (order: OrderRow) => order.items.filter((item) => getItemShortfall(order, item) > 0).length;
