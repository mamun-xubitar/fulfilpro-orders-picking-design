'use client';

import type { OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import { isOrderFullyFulfilled, isOrderFulfillmentLocked } from '../utils';
import { CardBody, CardShell } from './ItemsCard';
import Badge from './Badge';
import { Icon } from './icons';

const BTN = 'inline-flex h-[26px] flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg border px-[9px] text-[11px] font-bold disabled:cursor-not-allowed cursor-pointer';
const OFF = 'border-orders-border bg-orders-surface-muted text-orders-text-subtle';
const GHOST = 'border-orders-border-strong bg-orders-surface text-orders-text-body hover:bg-orders-surface-muted';
const Label = ({ children }: { children: React.ReactNode }) => <span className="mb-1 mt-2 block text-[9.5px] font-bold uppercase tracking-[.35px] text-orders-text-subtle">{children}</span>;

/** Print label + Message row (prototype `fulMsg`). */
function LabelMessage({ p, order, off }: { p: OrdersPageBundle; order: OrderRow; off: boolean }) {
  return (
    <div className="flex gap-[5px]">
      {p.caps.labels && (
        <button type="button" disabled={off || p.printingOrderId === order.id} title="Print the 4×6 shipping label" onClick={() => void p.printPackingSlipLabel(order)} className={`${BTN} ${off ? OFF : GHOST}`}><Icon name="printer" className="h-3 w-3" />{p.printingOrderId === order.id ? 'Loading…' : 'Print Label'}</button>
      )}
      <button type="button" disabled={off} title="Message the admins about this order" onClick={() => void p.openMessageModal(order)} className={`${BTN} ${off ? OFF : GHOST}`}>
        <Icon name="chat" className="h-3 w-3" />Message{order.messageCount > 0 && <span className="ml-0.5 rounded-full bg-orders-primary px-[5px] text-[9px] font-bold leading-[14px] text-white">{order.messageCount}</span>}
      </button>
    </div>
  );
}

/** Today's expanded "Actions" block (Staff): always shown, disabled once fulfilled, canceled or closed. */
function ActionsBox({ p, order }: { p: OrdersPageBundle; order: OrderRow }) {
  const done = isOrderFullyFulfilled(order);
  const locked = isOrderFulfillmentLocked(order);
  const off = locked || done || Boolean(p.fulSaving[order.id]);
  const tip = locked ? 'Closed or canceled orders cannot be fulfilled' : done ? 'Already fully fulfilled' : '';
  const text = (t: string) => (locked ? 'Fulfilment locked' : p.fulSaving[order.id] ? 'Confirming…' : t);
  return (
    <div className="flex flex-col gap-[5px]">
      <div className="flex gap-[5px]">
        <button type="button" disabled={off} title={tip} onClick={() => p.openFulfillmentConfirmation(order, { allRemaining: true })} className={`${BTN} h-7 ${off ? OFF : 'border-transparent bg-orders-primary text-white hover:bg-orders-primary-hover'}`}>{text('Confirm Fulfilment')}</button>
        <button type="button" disabled={off} title={tip || 'Confirm fulfilment and print the shipping label'} onClick={() => { p.openFulfillmentConfirmation(order, { allRemaining: true }); void p.printPackingSlipLabel(order); }} className={`${BTN} h-7 ${off ? OFF : 'border-transparent bg-[#0284c7] text-white hover:bg-[#0369a1]'}`}>{text('Confirm & Print')}</button>
      </div>
      <LabelMessage p={p} order={order} off={done} />
    </div>
  );
}

export default function FulfilmentCard({ p, order }: { p: OrdersPageBundle; order: OrderRow }) {
  const { caps } = p;
  const confs = order.fulfillmentItems.confirmations;
  const fulfilled = isOrderFullyFulfilled(order);
  const locked = isOrderFulfillmentLocked(order);
  const noLines = p.getFulfillmentLines(order).length === 0;
  const confirmOff = Boolean(p.fulSaving[order.id]) || fulfilled || noLines;
  const confirmTip = fulfilled ? 'Already fully fulfilled' : noLines ? 'Tick Full or enter a partial quantity first' : '';
  const packed = order.totalQuantity > 0 && order.packedQuantity >= order.totalQuantity;
  const stillToFulfil = order.items.filter((i) => (i.fulfilledQuantity ?? 0) < i.qty).length;
  const lockNote = locked && (
    <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-orders-border-strong bg-orders-surface-muted px-[9px] py-[7px] text-[10.5px] leading-[1.35] text-orders-text-muted">
      <Icon name="lock" className="h-3.5 w-3.5" /><span><b className="text-orders-text">Fulfilment locked</b><br />{order.canceled ? 'Canceled' : 'Closed'} orders cannot be fulfilled.</span>
    </div>
  );
  return (
    <CardShell title="Fulfilment" icon="tracking">
      <CardBody>
        {lockNote}
        {(!locked || confs.length > 0) && (
          <div className="flex items-center justify-between gap-2">
            <Badge tone={fulfilled ? 'ok' : confs.length > 0 ? 'warn' : packed ? 'info' : 'warn'}>{fulfilled ? 'Fulfilled' : confs.length > 0 ? 'Partial' : packed ? 'Ready to fulfil' : 'Not fully packed'}</Badge>
            <span className="text-[10px] tabular-nums text-orders-text-subtle">{fulfilled ? '' : confs.length > 0 ? `${stillToFulfil} line${stillToFulfil === 1 ? '' : 's'} still to fulfil` : packed ? 'All lines packed' : `${order.packedQuantity}/${order.totalQuantity} packed`}</span>
          </div>
        )}
        {!locked && caps.admin && (
          <>
            <div className="flex gap-[5px]">
              <button type="button" disabled={confirmOff} title={confirmTip} onClick={() => p.openFulfillmentConfirmation(order)} className={`${BTN} border-transparent bg-orders-primary text-white hover:bg-orders-primary-hover disabled:border-orders-border disabled:bg-orders-surface-muted disabled:text-orders-text-subtle`}>Confirm fulfilment</button>
              <button type="button" disabled={confirmOff} title={confirmTip || 'Confirm fulfilment and print the shipping label'} onClick={() => { p.openFulfillmentConfirmation(order); void p.printPackingSlipLabel(order); }} className={`${BTN} ${GHOST} disabled:border-orders-border disabled:bg-orders-surface-muted disabled:text-orders-text-subtle`}><Icon name="printer" className="h-3 w-3" />Confirm &amp; Print</button>
            </div>
            <LabelMessage p={p} order={order} off={fulfilled} />
          </>
        )}
        {!caps.admin && caps.fulfilment && (<><Label>Actions</Label><ActionsBox p={p} order={order} /></>)}
      </CardBody>
    </CardShell>
  );
}
