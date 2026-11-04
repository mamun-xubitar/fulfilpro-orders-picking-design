'use client';

import type { OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import FulfillmentConfActions from '../FulfillmentConfActions';
import { formatFulfillmentDate, getFulfillmentInfo, isOrderFullyFulfilled, isOrderFulfillmentLocked } from '../utils';
import { CardBody, CardShell } from './ItemsCard';
import { TrackingButton } from './ExtrasBar';
import { formatDateTimeShort } from './queueUtils';
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
  const last = confs[confs.length - 1];
  const info = getFulfillmentInfo(order)[getFulfillmentInfo(order).length - 1];
  const fulfilled = isOrderFullyFulfilled(order);
  const locked = isOrderFulfillmentLocked(order);
  const tracking = order.trackings?.[0];
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
        {confs.length > 0 && last ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1"><Badge tone={fulfilled ? 'ok' : 'warn'}>{fulfilled ? 'Fulfilled' : 'Partial'}</Badge>{confs.length > 1 && <Badge>{confs.length} parcels</Badge>}</span>
              <span className="text-[10px] tabular-nums text-orders-text-subtle">{last.confirmedAt ? formatDateTimeShort(last.confirmedAt) : last.fulfillmentDate ? formatFulfillmentDate(last.fulfillmentDate) : ''}</span>
            </div>
            <dl className="grid grid-cols-[78px_1fr] items-baseline gap-x-2 gap-y-[3px] text-[11px]">
              {info?.carrier && (<><dt className="text-[9.5px] font-bold uppercase tracking-[.35px] text-orders-text-subtle">Carrier</dt><dd className="min-w-0 text-orders-text-body">{info.carrier}</dd></>)}
              {info?.trackingNumber && (
                <><dt className="text-[9.5px] font-bold uppercase tracking-[.35px] text-orders-text-subtle">Tracking</dt>
                <dd className="min-w-0 font-mono text-[10.5px] text-orders-text-body">{info.trackingUrl ? <a href={info.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-orders-primary hover:underline">{info.trackingNumber}<Icon name="external" className="h-2.5 w-2.5" /></a> : info.trackingNumber}</dd></>
              )}
              {tracking?.status && (<><dt className="text-[9.5px] font-bold uppercase tracking-[.35px] text-orders-text-subtle">Status</dt><dd className="flex items-center gap-[5px]"><Badge tone={tracking.status === 'Delivered' ? 'ok' : 'info'}>{tracking.status}</Badge>{caps.admin && <TrackingButton p={p} order={order} />}</dd></>)}
            </dl>
            {!fulfilled && stillToFulfil > 0 && <span className="text-[10px] text-orders-text-subtle">{stillToFulfil} line{stillToFulfil === 1 ? '' : 's'} still to fulfil</span>}
            {!locked && (caps.admin || p.userIsStaff) && <FulfillmentConfActions compact p={p} order={order} conf={last} confId={last.id ?? String(confs.length - 1)} />}
          </>
        ) : !locked ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <Badge tone={packed ? 'info' : 'warn'}>{packed ? 'Ready to fulfil' : 'Not fully packed'}</Badge>
              <span className="text-[10px] tabular-nums text-orders-text-subtle">{packed ? 'All lines packed' : `${order.packedQuantity}/${order.totalQuantity} packed`}</span>
            </div>
            {caps.admin && (
              <>
                <div className="flex gap-[5px]">
                  <button type="button" disabled={Boolean(p.fulSaving[order.id]) || p.getFulfillmentLines(order).length === 0} title={p.getFulfillmentLines(order).length === 0 ? 'Tick Full or enter a partial quantity first' : ''} onClick={() => p.openFulfillmentConfirmation(order)} className={`${BTN} border-transparent bg-orders-primary text-white hover:bg-orders-primary-hover disabled:border-orders-border disabled:bg-orders-surface-muted disabled:text-orders-text-subtle`}>Confirm fulfilment</button>
                  <button type="button" disabled={Boolean(p.fulSaving[order.id]) || p.getFulfillmentLines(order).length === 0} title="Confirm fulfilment and print the shipping label" onClick={() => { p.openFulfillmentConfirmation(order); void p.printPackingSlipLabel(order); }} className={`${BTN} ${GHOST} disabled:border-orders-border disabled:bg-orders-surface-muted disabled:text-orders-text-subtle`}><Icon name="printer" className="h-3 w-3" />Confirm &amp; Print</button>
                </div>
                <LabelMessage p={p} order={order} off={false} />
              </>
            )}
          </>
        ) : null}
        {!caps.admin && caps.fulfilment && (<><Label>Actions</Label><ActionsBox p={p} order={order} /></>)}
      </CardBody>
    </CardShell>
  );
}
