'use client';

import type { OrderItem, OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import { getFulfilledQty } from '../utils';
import { getItemShortfall } from './queueUtils';
import { Icon } from './icons';
import Badge from './Badge';

const PO_LABEL = { REQUESTED: 'Requested', PARTIALLY_RECEIVED: 'Part received', RECEIVED: 'Received', CANCELLED: 'Cancelled' } as const;
const PO_TONE = { REQUESTED: 'info', PARTIALLY_RECEIVED: 'warn', RECEIVED: 'ok', CANCELLED: 'neutral' } as const;

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
    const eta = etaOf(po.deliveryDate);
    const sub = po.status === 'RECEIVED' ? `${po.received}/${po.ordered} in` : po.status === 'PARTIALLY_RECEIVED' ? `${po.received}/${po.ordered} in${eta ? ` · ETA ${eta}` : ''}` : `${po.ordered} on PO${eta ? ` · ETA ${eta}` : ''}`;
    return (
      <span className="flex flex-col items-start leading-tight" title={`Purchase order #${po.number} · ${PO_LABEL[po.status]}`}>
        <Badge tone={PO_TONE[po.status]}>#{po.number} {PO_LABEL[po.status]}</Badge>
        <span className="text-[10.5px] text-orders-text-subtle">{sub}</span>
      </span>
    );
  }
  if (locked) return <span className="text-orders-border-strong">-</span>;
  if (inv && short <= 0) return <span className="text-orders-border-strong">-</span>;
  if (!p.caps.createPo) {
    return inv
      ? <Badge tone="bad">No PO</Badge>
      : <Badge title="This product is not in the hub catalogue yet">Not in hub</Badge>;
  }
  const remaining = Math.max(0, item.qty - getFulfilledQty(order, item.id));
  const quantity = inv ? short : remaining;
  const creating = p.creatingPoKey === `${order.id}:${item.id}`;
  const title = inv
    ? `Create a purchase order for ${quantity} piece${quantity === 1 ? '' : 's'}`
    : 'Not in the hub yet: adds the product under this store, then opens the purchase order';
  return (
    <button type="button" disabled={Boolean(p.creatingPoKey)} title={title} onClick={() => void p.openCreatePo(order, item, quantity)} className="flex h-5 items-center gap-0.5 rounded-md border border-orders-primary-ring bg-orders-primary-soft px-1.5 text-[10px] font-bold text-orders-primary-ink hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer">
      <Icon name={creating ? 'refresh' : 'plus'} className={`h-2.5 w-2.5 ${creating ? 'animate-spin' : ''}`} />PO
    </button>
  );
}
