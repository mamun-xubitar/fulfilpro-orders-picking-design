// Orders whose shipping label was printed more than a day ago but that still haven't been packed
// (late_unpacked) or, once packed, still haven't been fulfilled in Shopify (shipped_delayed).
const LATE_AFTER_LABEL_MS = 24 * 60 * 60 * 1000;

type LateLabelInput = {
  labelPrintedAt: string | Date | null;
  canceled: boolean;
  closed: boolean;
  fulfillmentStatus: string | null;
  packingStatus: string;
};

export function getLateLabelStatus(order: LateLabelInput, now = Date.now()): 'late_unpacked' | 'shipped_delayed' | null {
  if (!order.labelPrintedAt || order.canceled || order.closed || order.fulfillmentStatus === 'fulfilled') return null;
  if (now - new Date(order.labelPrintedAt).getTime() < LATE_AFTER_LABEL_MS) return null;
  return order.packingStatus === 'packed' ? 'shipped_delayed' : 'late_unpacked';
}

export function matchesPackingFilter(selected: Set<string>, order: LateLabelInput, now = Date.now()) {
  if (selected.has(order.packingStatus)) return true;
  const late = getLateLabelStatus(order, now);
  return late !== null && selected.has(late);
}
