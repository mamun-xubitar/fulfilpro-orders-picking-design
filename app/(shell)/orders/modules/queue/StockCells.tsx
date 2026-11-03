'use client';

import type { OrderItem, OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import { getFulfilledQty } from '../utils';
import { getItemShortfall } from './queueUtils';
import { Icon } from './icons';

const PO_LABEL = { REQUESTED: 'Requested', PARTIALLY_RECEIVED: 'Part received', RECEIVED: 'Received', CANCELLED: 'Cancelled' } as const;
const PO_TONE = { REQUESTED: 'bg-orders-info-soft text-orders-info', PARTIALLY_RECEIVED: 'bg-orders-warning-soft text-orders-warning-ink', RECEIVED: 'bg-orders-success-soft text-orders-success-ink', CANCELLED: 'bg-orders-canvas text-orders-text-muted' } as const;

const etaOf = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : null);

/** Free hub stock for the line. Red when the order is short, amber when it just covers it. */
export function AvailCell({ order, item }: { order: OrderRow; item: OrderItem }) {
  const inv = item.inventory;
  if (!inv) return <span className="text-orders-border-strong" title="This product is not in the hub catalogue yet">-</span>;
  const short = getItemShortfall(order, item) > 0;
  const remaining = Math.max(0, item.qty - getFulfilledQty(order, item.id));
  const tight = !short && inv.available + inv.ownAllocated === remaining && remaining > 0;
  return (
    <b className={`tabular-nums ${short ? 'text-orders-danger' : tight ? 'text-orders-warning-ink' : 'text-orders-text'}`} title="Available = on hand minus allocated (hub stock shared by all stores)">
      {inv.available}
    </b>
  );
}

/** PO status of the line's variant, plus "+ PO" for Admin when the order is short. */
export function PoCell({ p, order, item }: { p: OrdersPageBundle; order: OrderRow; item: OrderItem }) {
  const inv = item.inventory;
  const short = getItemShortfall(order, item);
  const locked = order.canceled || order.closed || getFulfilledQty(order, item.id) >= item.qty;
  const po = inv?.po;
  if (po) {
    const sub = po.status === 'RECEIVED' ? `${po.received}/${po.ordered} in` : [`${po.received}/${po.ordered} in`, etaOf(po.deliveryDate) && `ETA ${etaOf(po.deliveryDate)}`].filter(Boolean).join(' · ');
    return (
      <span className="flex flex-col items-start leading-tight" title={`Purchase order #${po.number} · ${PO_LABEL[po.status]}`}>
        <span className={`rounded-full px-1.5 text-[9.5px] font-bold ${PO_TONE[po.status]}`}>#{po.number} {PO_LABEL[po.status]}</span>
        <span className="text-[10px] text-orders-text-muted">{sub}</span>
      </span>
    );
  }
  if (locked) return <span className="text-orders-border-strong">-</span>;
  if (!inv) return <span className="rounded-full bg-orders-canvas px-1.5 text-[9.5px] font-bold text-orders-text-muted" title="This product is not in the hub catalogue yet">Not in hub</span>;
  if (short <= 0) return <span className="text-orders-border-strong">-</span>;
  if (!p.caps.createPo) return <span className="rounded-full bg-orders-danger-soft px-1.5 text-[9.5px] font-bold text-orders-danger-ink">No PO</span>;
  return (
    <button type="button" title={`Create a purchase order for ${short} piece${short === 1 ? '' : 's'} in Inventory`} onClick={() => p.openCreatePo(order, item, short)} className="flex h-5 items-center gap-0.5 rounded-md border border-orders-primary-ring bg-orders-primary-soft px-1.5 text-[10px] font-bold text-orders-primary-ink hover:brightness-95 cursor-pointer">
      <Icon name="plus" className="h-2.5 w-2.5" />PO
    </button>
  );
}
