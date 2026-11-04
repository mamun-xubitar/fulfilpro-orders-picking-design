'use client';

import type { OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import { getFulfillmentInfo, isOrderFullyFulfilled, isOrderFulfillmentLocked, formatFulfillmentDate } from '../utils';
import FulfillmentConfActions from '../FulfillmentConfActions';
import { CardShell } from './ItemsCard';
import Badge from './Badge';
import { Icon } from './icons';

const base = 'flex h-7 flex-1 items-center justify-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed cursor-pointer';
const off = 'border-orders-border bg-orders-canvas text-orders-text-subtle';

function ActionButtons({ p, order }: { p: OrdersPageBundle; order: OrderRow }) {
  const fulfilled = isOrderFullyFulfilled(order);
  const locked = isOrderFulfillmentLocked(order);
  const saving = Boolean(p.fulSaving[order.id]);
  const noLines = p.getFulfillmentLines(order).length === 0;
  const confirmOff = locked || fulfilled || saving || noLines;
  const confirmTip = locked ? 'Closed or canceled orders cannot be fulfilled' : fulfilled ? 'Already fully fulfilled' : noLines ? 'Tick Full or enter a partial quantity first' : '';
  const label = (text: string) => (locked ? 'Fulfilment locked' : saving ? 'Confirming…' : text);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        <button type="button" disabled={confirmOff} title={confirmTip} onClick={() => p.openFulfillmentConfirmation(order)} className={`${base} ${confirmOff ? off : 'border-orders-primary bg-orders-primary text-white hover:bg-orders-primary-hover'}`}>{label('Confirm fulfilment')}</button>
        <button type="button" disabled={confirmOff} title={confirmTip || 'Confirm fulfilment and print the shipping label'} onClick={() => { p.openFulfillmentConfirmation(order); void p.printPackingSlipLabel(order); }} className={`${base} ${confirmOff ? off : 'border-orders-info bg-orders-info text-white hover:brightness-110'}`}>{label('Confirm & print')}</button>
      </div>
      <div className="flex gap-1.5">
        <button type="button" disabled={fulfilled || p.printingOrderId === order.id} title={fulfilled ? 'Fulfilled: label locked' : 'Print the shipping label'} onClick={() => void p.printPackingSlipLabel(order)} className={`${base} ${fulfilled ? off : 'border-orders-border-strong bg-orders-surface text-orders-text-body hover:bg-orders-surface-muted'}`}><Icon name="printer" className="h-3 w-3" />{p.printingOrderId === order.id ? 'Loading…' : 'Print label'}</button>
        <button type="button" disabled={fulfilled} title={fulfilled ? 'Fulfilled: messages locked' : 'Message the admins about this order'} onClick={() => void p.openMessageModal(order)} className={`${base} ${fulfilled ? off : 'border-orders-border-strong bg-orders-surface text-orders-text-body hover:bg-orders-surface-muted'}`}>
          <Icon name="chat" className="h-3 w-3" />Message{order.messageCount > 0 && <b className="rounded-full bg-orders-primary px-1 text-[9px] text-white">{order.messageCount}</b>}
        </button>
      </div>
      {p.fulMessages[order.id] && <span className="text-center text-[10.5px] font-semibold text-orders-success-ink">{p.fulMessages[order.id]}</span>}
    </div>
  );
}

export default function FulfilmentCard({ p, order }: { p: OrdersPageBundle; order: OrderRow }) {
  const infos = getFulfillmentInfo(order);
  const last = order.fulfillmentItems.confirmations[order.fulfillmentItems.confirmations.length - 1];
  const fulfilled = isOrderFullyFulfilled(order);
  const locked = isOrderFulfillmentLocked(order);
  const info = infos[infos.length - 1];
  const tracking = order.trackings?.[0];
  const ready = order.totalQuantity > 0 && order.packedQuantity >= order.totalQuantity;
  return (
    <CardShell title="Fulfilment" icon="tracking" right={last?.fulfillmentDate ? formatFulfillmentDate(last.fulfillmentDate) : undefined}>
      <div className="flex flex-col gap-2 p-3">
        {locked && (
          <div className="flex items-start gap-1.5 rounded-lg border border-orders-border bg-orders-canvas p-2 text-[10.5px] text-orders-text-muted"><Icon name="lock" className="mt-0.5 h-3 w-3" /><span><b className="text-orders-text">Fulfilment locked</b><br />{order.canceled ? 'Canceled' : 'Closed'} orders cannot be fulfilled.</span></div>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={fulfilled ? 'ok' : order.fulfillmentItems.confirmations.length > 0 ? 'warn' : ready ? 'info' : 'warn'}>
            {fulfilled ? 'Fulfilled' : order.fulfillmentItems.confirmations.length > 0 ? 'Partially fulfilled' : ready ? 'Ready to fulfil' : 'Not fully packed'}
          </Badge>
          {order.fulfillmentItems.confirmations.length > 1 && <Badge>{order.fulfillmentItems.confirmations.length} parcels</Badge>}
          {tracking?.status && <Badge tone={tracking.status === 'Delivered' ? 'ok' : 'info'}>{tracking.status}</Badge>}
        </div>
        {info && (
          <dl className="grid grid-cols-[58px_1fr] gap-x-2 gap-y-0.5 text-[11px]">
            {info.carrier && (<><dt className="text-[9.5px] font-bold uppercase text-orders-text-subtle">Carrier</dt><dd className="text-orders-text">{info.carrier}</dd></>)}
            {info.trackingNumber && (<><dt className="text-[9.5px] font-bold uppercase text-orders-text-subtle">Tracking</dt><dd className="font-mono text-orders-text">{info.trackingUrl ? <a href={info.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-orders-primary hover:underline">{info.trackingNumber}</a> : info.trackingNumber}</dd></>)}
          </dl>
        )}
        {last && !locked && (p.caps.admin || p.userIsStaff) && (
          <FulfillmentConfActions p={p} order={order} conf={last} confId={last.id ?? String(order.fulfillmentItems.confirmations.length - 1)} />
        )}
        <span className="text-[9.5px] font-bold uppercase tracking-wide text-orders-text-subtle">Actions</span>
        <ActionButtons p={p} order={order} />
      </div>
    </CardShell>
  );
}
