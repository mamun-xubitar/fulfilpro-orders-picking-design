import type { TrackingRow } from './types';

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

export function trackingLinkUrl(row: Pick<TrackingRow, 'trackingUrl' | 'trackingNumber'>): string {
  return row.trackingUrl || `https://t.17track.net/en#nums=${encodeURIComponent(row.trackingNumber)}`;
}
