'use client';

import type { OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import { formatStockStatus, isOrderFullyFulfilled, isOrderFulfillmentLocked, orderNameEntries } from '../utils';
import { getDecoProgress } from './queueUtils';
import Badge from './Badge';
import { Icon } from './icons';
import NamesPopover from './NamesPopover';

const XS = 'inline-flex h-5 items-center justify-center gap-[3px] whitespace-nowrap rounded-[5px] border px-1.5 text-[9.5px] font-bold disabled:cursor-not-allowed cursor-pointer';
const GHOST = `${XS} border-orders-border-strong bg-orders-surface text-orders-text-body hover:bg-orders-surface-muted`;

export function TrackingButton({ p, order }: { p: OrdersPageBundle; order: OrderRow }) {
  const t = order.trackings?.[0];
  const hasNumber = order.fulfillmentItems.confirmations.some((c) => c.trackingInfo?.number?.trim());
  if (!t && !hasNumber) return null;
  const delivered = t?.status === 'Delivered';
  const paused = t?.registrationStatus === 'paused';
  const tone = delivered || !t ? 'bg-orders-divider text-orders-text-subtle' : paused ? 'bg-orders-warning-soft text-orders-warning-ink' : 'bg-orders-success-soft text-orders-success-ink';
  const title = delivered ? 'Tracking: Delivered, nothing to do' : paused ? 'Restart tracking (paused)' : t ? `Pause tracking (${t.status ?? 'registered'})` : 'Register tracking';
  return <button type="button" title={title} aria-label="Tracking" disabled={delivered} onClick={() => p.openTrackingModal(order)} className={`flex h-[22px] w-[22px] items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer ${tone}`}><Icon name="tracking" className="h-3.5 w-3.5" /></button>;
}

/** Confirm fulfilment and "[printer] & Confirm" (Admin, Staff), at the right end of the bar: no separate Fulfilment card.
 * Disabled once fulfilled, locked (closed / canceled), saving, or while no line is ticked; Staff's edits still go through
 * the request flow inside the confirmation. */
function ConfirmButtons({ p, order }: { p: OrdersPageBundle; order: OrderRow }) {
  const locked = isOrderFulfillmentLocked(order);
  const done = isOrderFullyFulfilled(order);
  const saving = Boolean(p.fulSaving[order.id]);
  const noLines = p.getFulfillmentLines(order).length === 0;
  const off = locked || done || saving || noLines;
  const tip = locked ? 'Closed or canceled orders cannot be fulfilled' : done ? 'Already fully fulfilled' : noLines ? 'Tick Full or enter a partial quantity first' : '';
  const OFF = 'border-orders-border bg-orders-surface-muted text-orders-text-subtle';
  return (
    <>
      {p.fulMessages[order.id] && <span className="text-[10px] font-semibold text-orders-success-ink">{p.fulMessages[order.id]}</span>}
      <button type="button" disabled={off} title={tip} onClick={() => p.openFulfillmentConfirmation(order)} className={`${XS} ${off ? OFF : 'border-transparent bg-orders-primary text-white hover:bg-orders-primary-hover'}`}>{locked ? 'Fulfilment locked' : saving ? 'Confirming…' : 'Confirm fulfilment'}</button>
      <button type="button" disabled={off} title={tip || 'Confirm fulfilment and print the shipping label'} onClick={() => { p.openFulfillmentConfirmation(order); void p.printPackingSlipLabel(order); }} className={`${XS} ${off ? OFF : 'border-orders-border-strong bg-orders-surface text-orders-text-body hover:bg-orders-surface-muted'}`}><Icon name="printer" className="h-2.5 w-2.5" />&amp; Confirm</button>
    </>
  );
}

/** The strip under "Order items": state chips on the left, role-gated actions on the right (prototype `extrasBar`). */
export default function ExtrasBar({ p, order }: { p: OrdersPageBundle; order: OrderRow }) {
  const { caps } = p;
  const locked = isOrderFulfillmentLocked(order);
  const parcels = order.fulfillmentItems.confirmations.length;
  const sa = order.stockAdjustment;
  const deco = caps.decoration ? getDecoProgress(order) : [];
  const restock = caps.requestStock && order.backInStockStatus;
  return (
    <div className="flex min-h-[30px] flex-wrap items-center gap-x-1.5 gap-y-[3px] border-b border-orders-divider bg-orders-surface px-2 py-[3px]">
      {caps.labels && order.labelPrintedAt && <Badge tone="ok" title="Shipping label printed"><Icon name="tag" className="h-2.5 w-2.5" />Label printed</Badge>}
      {restock && <Badge tone={order.backInStockStatus === 'back_in_stock' ? 'ok' : 'warn'} title="Back-in-stock request">{formatStockStatus(order.backInStockStatus!)}</Badge>}
      {deco.map((d) => <Badge key={d.key} tone={d.tone}>{d.label}</Badge>)}
      {order.closed && <Badge title="Order closed in Shopify">Closed</Badge>}
      <span className="flex-1" />
      {caps.requestStock && !order.canceled && (
        <button type="button" title="Ask for a supplier restock of lines that are out of stock" onClick={() => void p.openStockModal(order)} className={GHOST}>
          <Icon name="cube" className="h-2.5 w-2.5" />Request stock{order.stockRequestCount > 0 && <i className="rounded-full bg-orders-warning-ink px-1 text-[8.5px] font-bold not-italic leading-3 text-white">{order.stockRequestCount}</i>}
        </button>
      )}
      {caps.fulfilment && (
        <button type="button" disabled={parcels === 0} title={parcels > 0 ? 'Fulfilment history: confirmations, barcodes and shipped lines' : 'No fulfilments yet'} onClick={() => p.setFulfillmentViewOrderId(order.id)} className={`${XS} ${parcels > 0 ? 'border-orders-primary-ring bg-orders-surface text-orders-primary-ink hover:bg-orders-primary-soft' : 'border-orders-border bg-orders-surface-muted text-orders-text-subtle'}`}>
          Fulfilments{parcels > 1 && ` (${parcels})`}<Icon name="chevronRight" className="h-2.5 w-2.5" />
        </button>
      )}
      {caps.admin && (
        <button type="button" disabled={!sa} title="Manage stock adjustment" onClick={() => void p.openStockAdjustmentModal(order)} className={GHOST}>Stock {sa ? `${sa.managedCount}/${sa.totalCount}` : '-'}</button>
      )}
      {caps.names && orderNameEntries(order).length > 0 && <NamesPopover p={p} order={order} className={GHOST} />}
      {caps.admin && !locked && (
        <button type="button" onClick={() => p.openAddLineItemModal(order, order.items[order.items.length - 1]?.id ?? null)} className={GHOST}><Icon name="plus" className="h-2.5 w-2.5" />Add line</button>
      )}
      {caps.admin && <TrackingButton p={p} order={order} />}
      {caps.fulfilment && <ConfirmButtons p={p} order={order} />}
    </div>
  );
}
