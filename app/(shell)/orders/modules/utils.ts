import type { ApiResponse, BackInStockStatus, OrderItem, OrderRow, PackingSlipLabel, ShippingLine } from './types';

export type PaginationItem = number | 'ellipsis';

export const getNameAttribute = (item: OrderItem) =>
  item.customAttributes?.find((a) => a.name.trim().toLowerCase() === 'name') ?? null;

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
  return 'Pending';
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
