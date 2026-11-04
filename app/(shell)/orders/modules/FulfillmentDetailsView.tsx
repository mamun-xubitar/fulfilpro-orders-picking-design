'use client';

import type { OrderRow } from './types';
import type { OrdersPageBundle } from './ordersPageContext';
import { formatFulfillmentDate } from './utils';
import FulfillmentConfActions from './FulfillmentConfActions';
import Badge from './queue/Badge';
import { Icon } from './queue/icons';
import { formatDateTimeShort } from './queue/queueUtils';

const DT = 'text-[9.5px] font-bold uppercase tracking-[.35px] text-orders-text-subtle';

/** One card per parcel of the order (prototype `fcard`): status and date, carrier, tracking, lines, barcodes, then
 * Edit / Cancel (Admin) or Request edit / cancel (Staff). */
export default function FulfillmentDetailsView({ p, order }: { p: OrdersPageBundle; order: OrderRow }) {
  return (
    <div className="flex flex-col gap-2">
      {order.fulfillmentItems.confirmations.map((conf, index) => {
        const trackingNumber = conf.trackingInfo?.number?.trim();
        const tracking = order.trackings?.find((t) => t.trackingNumber === trackingNumber);
        const when = conf.confirmedAt ? formatDateTimeShort(conf.confirmedAt) : conf.fulfillmentDate ? formatFulfillmentDate(conf.fulfillmentDate) : '';
        return (
          <div key={conf.id ?? index} className="rounded-[9px] border border-orders-border bg-orders-surface-muted px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5"><b className="text-orders-text">Parcel {index + 1}</b>{tracking?.status && <Badge tone={tracking.status === 'Delivered' ? 'ok' : 'info'}>{tracking.status}</Badge>}</span>
              <span className="tabular-nums text-orders-text-subtle">{when}</span>
            </div>
            <dl className="mt-1 grid grid-cols-[78px_1fr] items-baseline gap-x-2 gap-y-[3px] text-[11px]">
              {conf.trackingInfo?.company && (<><dt className={DT}>Carrier</dt><dd className="text-orders-text-body">{conf.trackingInfo.company}</dd></>)}
              {trackingNumber && (<><dt className={DT}>Tracking</dt><dd className="font-mono text-[10.5px] text-orders-text-body">{conf.trackingInfo?.url ? <a href={conf.trackingInfo.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-orders-primary hover:underline">{trackingNumber}<Icon name="external" className="h-2.5 w-2.5" /></a> : trackingNumber}</dd></>)}
              <dt className={DT}>Lines</dt>
              <dd className="text-orders-text-body">{conf.lines.map((line) => <span key={line.lineItemId} className="block">{order.items.find((i) => i.id === line.lineItemId)?.name ?? line.lineItemId} × {line.quantity}</span>)}</dd>
              {conf.barcodes && conf.barcodes.length > 0 && (<><dt className={DT}>Barcodes</dt><dd className="font-mono text-[10.5px] text-orders-text-body">{conf.barcodes.join(', ')}</dd></>)}
            </dl>
            {(p.userIsAdmin || p.userIsStaff) && (
              <div className="mt-1.5 flex justify-end"><FulfillmentConfActions compact p={p} order={order} conf={conf} confId={conf.id ?? String(index)} /></div>
            )}
          </div>
        );
      })}
    </div>
  );
}
