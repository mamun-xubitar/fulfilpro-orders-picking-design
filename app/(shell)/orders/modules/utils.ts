import type { ApiResponse, BackInStockItem, BackInStockStatus, FulfillmentEditRequestRow, OrderItem, OrderRow, PackingSlipLabel, ShippingLine, WorkCommentDraft } from './types';
import type { NameAttributeRow } from './nameAttributesExport';
import type { DecorationCategory } from '@/lib/roles';

export function getFulfilledQty(order: Pick<OrderRow, 'fulfillmentItems'>, lineItemId: string): number {
  return order.fulfillmentItems.confirmations.reduce((sum, confirmation) => {
    return sum + confirmation.lines.reduce((lineSum, line) => (
      line.lineItemId === lineItemId ? lineSum + line.quantity : lineSum
    ), 0);
  }, 0);
}

export type PaginationItem = number | 'ellipsis';

export const getNameAttribute = (item: OrderItem) =>
  item.customAttributes?.find((a) => a.name.trim().toLowerCase() === 'name') ?? null;

export type DecorationBadge = { label: string; className: string; count?: number };

// Decoration status badges for the order Status column (emb / partially emb / print / partially print).
export function getDecorationStatusBadges(order: Pick<OrderRow, 'items'>): DecorationBadge[] {
  const badges: DecorationBadge[] = [];
  const summarize = (items: OrderItem[]) => {
    const total = items.reduce((sum, i) => sum + i.qty, 0);
    const done = items.reduce((sum, i) => sum + (i.decoration?.doneQty ?? 0), 0);
    const count = new Set(items.flatMap((i) => (i.assignments ?? []).map((a) => a.assigneeId))).size;
    return { total, done, count };
  };

  const emb = order.items.filter((i) => i.isEmbroidery);
  if (emb.length > 0) {
    const { total, done, count } = summarize(emb);
    badges.push({ label: `${done}/${total} Emb`, className: 'bg-purple-100 text-purple-700', count: count || undefined });
  }

  const print = order.items.filter((i) => i.isPrint);
  if (print.length > 0) {
    const { total, done, count } = summarize(print);
    badges.push({ label: `${done}/${total} Print`, className: 'bg-sky-100 text-sky-700', count: count || undefined });
  }

  return badges;
}

// Order-level decoration row tint (emb wins over print; applied only when no fulfilment color is present).
export function getOrderDecorationRowTint(order: Pick<OrderRow, 'items'>): string | null {
  if (order.items.some((i) => i.isEmbroidery)) return 'bg-purple-50 hover:bg-purple-100';
  if (order.items.some((i) => i.isPrint)) return 'bg-sky-50 hover:bg-sky-100';
  return null;
}

// Decoration tint for a product fulfilment row. Fulfilment color has priority:
// only applied when the row has no fulfilment-derived background.
export function getDecorationRowTint(item: OrderItem): string | null {
  const decoration = item.decoration;
  const assignedCount = item.assignments?.length ?? 0;
  const relevant = Boolean(item.isEmbroidery || item.isPrint || assignedCount > 0);
  if (!relevant) return null;
  if (decoration?.fullyDone) return 'bg-emerald-50';
  if ((decoration?.doneQty ?? 0) > 0) return 'bg-pink-50';
  if (assignedCount > 0) return 'bg-amber-50'; // assigned but not started/done
  return null;
}

// Combine a fulfilment row class with a decoration tint, keeping fulfilment color priority.
export function applyDecorationTint(fulfillmentClass: string, item: OrderItem): string {
  if (/\bbg-/.test(fulfillmentClass)) return fulfillmentClass;
  const tint = getDecorationRowTint(item);
  return tint ? `${fulfillmentClass} ${tint}` : fulfillmentClass;
}

export function compactAddressParts(parts: Array<string | null>) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(', ');
}

export function getOrderAddressLines(order: Pick<OrderRow, 'address' | 'address2' | 'city' | 'state' | 'country'>) {
  return [
    compactAddressParts([order.address]),
    compactAddressParts([order.address2]),
    compactAddressParts([order.city, order.state, order.country]),
  ].filter(Boolean);
}

export function getPackingSlipAddressLines(label: Pick<PackingSlipLabel, 'address' | 'address2' | 'city' | 'state' | 'zip' | 'country'>) {
  return [
    compactAddressParts([label.address]),
    compactAddressParts([label.address2]),
    compactAddressParts([label.city, label.state, label.zip]),
    compactAddressParts([label.country]),
  ].filter(Boolean);
}

export function formatShippingMoney(value: number | null, currencyCode: string | null) {
  if (value === null || !Number.isFinite(value)) return '-';

  if (!currencyCode) {
    return value.toFixed(2);
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currencyCode}`;
  }
}

export function getShippingDiscountCodes(line: ShippingLine) {
  return Array.from(new Set([
    ...(line.discountCodes || []),
    ...(line.discountAllocations || [])
      .map((allocation) => allocation.code)
      .filter((code): code is string => Boolean(code)),
  ]));
}

export function getShippingLineFinalPrice(line: ShippingLine) {
  return line.discountedPrice ?? Math.max(0, line.price - line.discountAllocations.reduce((sum, item) => sum + item.amount, 0));
}

export function getApiErrorMessage(response: ApiResponse<unknown>, fallback: string) {
  if (response.errors?.length) return response.errors.join(', ');
  return response.message || fallback;
}

export function isOrderFulfillmentLocked(order: Pick<OrderRow, 'closed' | 'canceled' | 'status'>) {
  const status = order.status.toLowerCase();
  return order.canceled || order.closed || status === 'canceled' || status === 'cancelled' || status === 'closed';
}

export function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function formatSyncDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatStockStatus(status: BackInStockStatus) {
  if (status === 'back_in_stock') return 'Restocked';
  if (status === 'partially_back_in_stock') return 'Partially Restocked';
  return 'Need Restock';
}

export function getStockStatusChip(status: BackInStockStatus) {
  if (status === 'back_in_stock') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (status === 'partially_back_in_stock') return 'bg-blue-50 text-blue-700 border border-blue-200';
  return 'bg-amber-50 text-amber-800 border border-amber-200';
}

export const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function getMonthDays(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return days;
}

export function fmtCalDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const yr = new Date().getFullYear() !== y ? ` ${y}` : '';
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${d}${yr}`;
}

export const rowItemKey = (orderId: string, itemIndex: number) => `${orderId}-${itemIndex}`;

export const isLineFullyFulfilled = (order: OrderRow, item: OrderItem) => getFulfilledQty(order, item.id) >= item.qty;

export function getFulfillmentRowClass(
  fulfilledQty: number,
  itemQty: number,
  remainingQty: number,
  isFull: boolean,
  partialValue: number,
) {
  const baseClass = 'border-b border-blue-100 transition-colors duration-150';

  if (itemQty > 0 && fulfilledQty >= itemQty) {
    return `${baseClass} bg-emerald-100`;
  }

  if ((isFull || partialValue >= remainingQty) && remainingQty > 0) {
    return `${baseClass} bg-blue-100`;
  }

  if (partialValue > 0) {
    return `${baseClass} bg-pink-100`;
  }

  if (fulfilledQty > 0) {
    return `${baseClass} bg-purple-100`;
  }

  return baseClass;
}

export function isOrderFullyFulfilled(order: OrderRow) {
  const totalQuantity = order.items.reduce((sum, item) => sum + Math.max(0, item.qty), 0);
  const fulfilledQuantity = order.fulfillmentItems.confirmations.reduce((sum, confirmation) => {
    return sum + confirmation.lines.reduce((lineSum, line) => lineSum + line.quantity, 0);
  }, 0);
  return totalQuantity > 0 && fulfilledQuantity >= totalQuantity;
}

export function parseBarcodes(value: string) {
  return value.split(/\s+/).map((barcode) => barcode.trim()).filter(Boolean);
}

export function getFulfillmentInfo(order: OrderRow) {
  return order.fulfillmentItems.confirmations
    .map((confirmation) => ({
      date: confirmation.fulfillmentDate?.trim() ?? '',
      carrier: confirmation.trackingInfo?.company?.trim() ?? '',
      trackingNumber: confirmation.trackingInfo?.number?.trim() ?? '',
      trackingUrl: confirmation.trackingInfo?.url?.trim() ?? '',
    }))
    .filter((info) => info.date || info.carrier || info.trackingNumber);
}

export function formatFulfillmentDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;

  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getBackInStockEligibleItems(order: OrderRow) {
  return order.items
    .map((item) => {
      const fulfilledQty = getFulfilledQty(order, item.id);
      const remainingQty = Math.max(0, item.qty - fulfilledQty);
      return {
        lineItemId: item.id,
        name: item.name,
        sku: item.sku,
        vendor: item.vendor,
        remainingQty,
      };
    })
    .filter((item) => item.remainingQty > 0);
}

export function createDefaultStockItem(order: OrderRow): BackInStockItem {
  const firstItem = getBackInStockEligibleItems(order)[0];
  return {
    lineItemId: firstItem?.lineItemId ?? '',
    dueDate: '',
    supplierName: firstItem?.vendor ?? '',
    quantity: firstItem?.remainingQty ?? 1,
    item: firstItem?.name ?? '',
  };
}

export function getAvailableStockItemsForRow(order: OrderRow, items: BackInStockItem[], rowIndex: number) {
  const selectedIds = new Set(
    items
      .map((item, index) => (index === rowIndex ? '' : item.lineItemId))
      .filter(Boolean)
  );
  return getBackInStockEligibleItems(order).filter((item) => !selectedIds.has(item.lineItemId));
}

export function hasStockItemAvailableToAdd(order: OrderRow, items: BackInStockItem[]) {
  return getBackInStockEligibleItems(order).some((item) => (
    !items.some((selected) => selected.lineItemId === item.lineItemId)
  ));
}

export const nameKey = (orderId: string, lineItemId: string) => `${orderId}:${lineItemId}`;

export const orderNameEntries = (order: OrderRow): Array<{ key: string; row: NameAttributeRow }> =>
  order.items.flatMap((item) => {
    const attr = getNameAttribute(item);
    if (!attr) return [];
    return [{ key: nameKey(order.id, item.id), row: { orderNumber: order.number, productTitle: item.title ?? item.name, value: attr.value } }];
  });

export const emptyCommentDraft = (): WorkCommentDraft => ({ sizes: '', colors: '', remarks: '', location: '', files: [], uploading: false });

type DecorationRelevanceOpts = {
  decoratorCategories: DecorationCategory[];
  currentUserId: string;
  showAll: boolean;
};

export function isDecorationRelevantItem(item: OrderItem, opts: DecorationRelevanceOpts): boolean {
  const { decoratorCategories, currentUserId, showAll } = opts;
  if (showAll) {
    return Boolean(
      item.isEmbroidery || item.isPrint ||
      (item.assignments?.length ?? 0) > 0 ||
      (item.decoration?.works.length ?? 0) > 0,
    );
  }
  if (decoratorCategories.includes('embroidery') && item.isEmbroidery) return true;
  if (decoratorCategories.includes('print') && item.isPrint) return true;
  if ((item.assignments ?? []).some((a) => a.assigneeId === currentUserId)) return true;
  if ((item.decoration?.works.length ?? 0) > 0) return true;
  return false;
}

export function getDecorationRelevantItems(order: Pick<OrderRow, 'items'>, opts: DecorationRelevanceOpts): OrderItem[] {
  return order.items.filter((item) => isDecorationRelevantItem(item, opts));
}

export function getReferenceItems(order: Pick<OrderRow, 'items'>, opts: DecorationRelevanceOpts): OrderItem[] {
  return order.items.filter((item) => !isDecorationRelevantItem(item, opts));
}

export function getActiveFulfillmentRequest(
  requests: FulfillmentEditRequestRow[],
  orderId: string,
  fulfillmentId: string | undefined,
  requestType: 'edit' | 'cancel',
) {
  if (!fulfillmentId) return null;
  return requests.find((r) =>
    r.fulfillmentId === fulfillmentId &&
    r.requestType === requestType &&
    (r.status === 'pending' || r.status === 'approved') &&
    new Date(r.expiresAt) > new Date()
  ) ?? null;
}
