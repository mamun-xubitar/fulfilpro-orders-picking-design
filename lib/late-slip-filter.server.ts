// Orders whose picking slip was first printed more than a day ago but that still haven't been packed
// (late_unpacked) or, once packed, still haven't been fulfilled in Shopify (shipped_delayed).
const LATE_AFTER_SLIP_MS = 24 * 60 * 60 * 1000;

type LateSlipInput = {
  slipPrintedAt: string | Date | null;
  canceled: boolean;
  closed: boolean;
  fulfillmentStatus: string | null;
  packingStatus: string;
};

export function getLateLabelStatus(order: LateSlipInput, now = Date.now()): 'late_unpacked' | 'shipped_delayed' | null {
  if (!order.slipPrintedAt || order.canceled || order.closed || order.fulfillmentStatus === 'fulfilled') return null;
  if (now - new Date(order.slipPrintedAt).getTime() < LATE_AFTER_SLIP_MS) return null;
  return order.packingStatus === 'packed' ? 'shipped_delayed' : 'late_unpacked';
}

export function matchesPackingFilter(selected: Set<string>, order: LateSlipInput, now = Date.now()) {
  if (selected.has(order.packingStatus)) return true;
  const late = getLateLabelStatus(order, now);
  return late !== null && selected.has(late);
}
