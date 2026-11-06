import { resolveSwatch } from '@/lib/inventory/colour';
import type { OrderItem, OrderRow } from '../types';
import { getFulfilledQty, isOrderFullyFulfilled } from '../utils';
import { getLineShortfall } from '../hooks/useCreatePo';
import type { OrderCapabilities } from '../capabilities';
import { getLineColumns, lineGap } from './lineColumns';

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
  if (caps.slipStatus) nodes.push({ key: 'slip', label: 'Slip', state: order.slipPrinted ? 'done' : 'none' });
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

export type RowStatus = 'canceled' | 'closed' | 'restock' | 'fulfilled' | 'partial' | 'packed' | 'emb' | 'prt' | 'plain';

/** Row status: canceled, closed, back in stock, then fulfilment / packing / decoration. */
export function getRowStatus(order: OrderRow, caps: OrderCapabilities): RowStatus {
  const fulfilled = isOrderFullyFulfilled(order);
  if (order.canceled) return 'canceled';
  if (order.closed) return 'closed';
  if (caps.requestStock && order.backInStockStatus && !fulfilled) return 'restock';
  if (order.status === 'fulfilled' || order.status === 'shipped') return 'fulfilled';
  if (order.status === 'partial' || order.status === 'partially_fulfilled') return 'partial';
  if (order.packingStatus === 'packed') return 'packed';
  if (caps.decoration && order.items.some((i) => i.isEmbroidery)) return 'emb';
  if (caps.decoration && order.items.some((i) => i.isPrint)) return 'prt';
  return 'plain';
}

const ROW_TINT: Record<RowStatus, string> = {
  canceled: 'bg-orders-tone-canceled hover:brightness-95',
  closed: 'bg-orders-tone-closed hover:brightness-95',
  restock: 'bg-orders-tone-restock hover:brightness-95',
  fulfilled: 'bg-orders-tone-fulfilled hover:brightness-95',
  partial: 'bg-orders-tone-partial hover:brightness-95',
  packed: 'bg-orders-tone-packed hover:brightness-95',
  emb: 'bg-orders-emb-soft hover:brightness-95',
  prt: 'bg-orders-prt-soft hover:brightness-95',
  plain: 'bg-orders-surface hover:bg-orders-surface-muted',
};

/** Colour of the 3px stripe at the start of an order's group, by status. */
const ROW_STRIPE: Record<RowStatus, string> = {
  canceled: '#ef4444',
  closed: '#9ca3af',
  restock: '#fbbf24',
  fulfilled: '#3b82f6',
  partial: '#f59e0b',
  packed: '#22c55e',
  emb: '#8b5cf6',
  prt: '#0ea5e9',
  plain: '#d1d5db',
};

export const getRowStripe = (order: OrderRow, caps: OrderCapabilities) => ROW_STRIPE[getRowStatus(order, caps)];

/** Row background by status. */
export const getRowTone = (order: OrderRow, caps: OrderCapabilities) => ROW_TINT[getRowStatus(order, caps)];

/** Embroidery / print progress (pieces done / total) and how many different decorators are assigned. */
export function getDecoProgress(order: OrderRow) {
  return (['isEmbroidery', 'isPrint'] as const).flatMap((key) => {
    const lines = order.items.filter((i) => i[key]);
    if (lines.length === 0) return [];
    const total = lines.reduce((s, i) => s + i.qty, 0);
    const done = lines.reduce((s, i) => s + (i.decoration?.doneQty ?? 0), 0);
    const assignees = new Set(lines.flatMap((i) => (i.assignments ?? []).map((a) => a.assigneeId))).size;
    return [{ key, label: `${done}/${total} ${key === 'isEmbroidery' ? 'EMB' : 'PRT'}`, tone: key === 'isEmbroidery' ? ('emb' as const) : ('prt' as const), assignees }];
  });
}

/** Grid columns of the queue table (prototype `colsA3`); the same template is used by the header and every row.
 * Customer is the flexible column, Items is fixed, and packing + fulfilment share one column. */
export function getGridColumns(caps: OrderCapabilities) {
  const nodes = (caps.slipStatus ? 1 : 0) + 1 + (caps.fulfilment ? 2 : 0);
  const icons = 4 + (caps.slip ? 1 : 0) + (caps.labels ? 1 : 0) + (caps.invoice ? 1 : 0) + (caps.admin ? 1 : 0);
  return ['20px', '96px', '50px', 'minmax(100px,1fr)', caps.admin ? '56px' : '', '112px', `${nodes * 34 + 4}px`, caps.fulfilment ? '112px' : '64px', caps.packedDate ? '116px' : '200px', `${icons * 24 + 4}px`].filter(Boolean).join(' ');
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

/** Smallest width a track can shrink to: "96px" -> 96, "minmax(80px,1fr)" -> 80. */
const trackMin = (track: string) => Number.parseFloat(track.replace('minmax(', ''));

/** Narrowest the queue table can be before it scrolls sideways: the main grid, or an opened order whose item
 * table, fulfilment/packing card and customer card sit side by side. Rows, panels and the header all get this
 * min-width, so their backgrounds reach the end of the scroll area. */
export function getTableMinWidth(caps: OrderCapabilities) {
  const main = getGridColumns(caps).split(' ');
  const mainWidth = main.reduce((sum, t) => sum + trackMin(t), 0) + (main.length - 1) * 8 + 20;
  const lines = getLineColumns(caps, true);
  const lineWidth = lines.reduce((sum, c) => sum + trackMin(c.width), 0) + (lines.length - 1) * lineGap(caps) + 16;
  const side = (caps.pack || caps.customer ? 184 : 0) + (caps.customer ? 232 : 0);
  return Math.max(mainWidth, lineWidth + side + 20);
}
