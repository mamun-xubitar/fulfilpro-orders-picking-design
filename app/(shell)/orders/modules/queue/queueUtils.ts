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

/** Grid columns of the queue table (prototype `colsA`); the same template is used by the header and every row. */
export function getGridColumns(caps: OrderCapabilities) {
  const nodes = (caps.slip ? 1 : 0) + 1 + (caps.fulfilment ? 2 : 0);
  const icons = 3 + (caps.slip ? 1 : 0) + (caps.labels ? 1 : 0) + (caps.invoice ? 1 : 0) + (caps.admin ? 1 : 0);
  return ['20px', '96px', '50px', '108px', caps.admin ? '58px' : '', 'minmax(80px,1fr)', `${nodes * 34 + 4}px`, caps.fulfilment ? '104px' : '', '84px', '132px', '52px', `${icons * 24 + 4}px`].filter(Boolean).join(' ');
}

/** "Today 09:42", "Yesterday 17:21" or "Wed 28 Oct": how the prototype shows when an order was placed. */
export function formatPlaced(iso: string | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days === 0) return `Today ${time}`;
  if (days === 1) return `Yesterday ${time}`;
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
}

/** Pieces of a line the hub cannot cover yet (0 when covered, locked, or the product is not in the hub). */
export function getItemShortfall(order: OrderRow, item: OrderItem) {
  if (!item.inventory || order.canceled || order.closed) return 0;
  const remaining = Math.max(0, item.qty - getFulfilledQty(order, item.id));
  return getLineShortfall(remaining, item.inventory);
}

export const countShortLines = (order: OrderRow) => order.items.filter((item) => getItemShortfall(order, item) > 0).length;

const STORE_HUES = ['#4f46e5', '#0891b2', '#c026d3', '#475569', '#0d9488', '#b45309'];

/** Short store code for the chip ("Harbour FC Shop" -> "HFS") and a stable dot colour per store. */
export function getStoreChip(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const code = (words.length > 1 ? words.map((w) => w[0]).join('') : name.trim()).replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || '?';
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return { code, hue: STORE_HUES[hash % STORE_HUES.length] };
}

/** "Tue 27 Oct · 09:05": date and time of a confirmation, as the prototype's Fulfilment card shows it. */
export function formatDateTimeShort(iso: string | undefined | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
  return `${date} · ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}`;
}
