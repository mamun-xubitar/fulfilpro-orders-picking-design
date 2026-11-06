'use client';

import type { OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import { CardBody, CardShell } from './ItemsCard';
import { Icon } from './icons';

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

/** Packing & slip (prototype `packBoxA3`): Confirm packed (or "All N items packed"), then the packing history. The slip
 * has no button here: the row's slip icon prints it. */
export default function PackingCard({ p, order }: { p: OrdersPageBundle; order: OrderRow }) {
  const total = order.totalQuantity;
  const allPacked = total > 0 && order.packedQuantity >= total;
  const blocked = order.canceled || order.closed;
  const history = (order.packingConfirmations ?? []).filter((c) => !c.canceledAt);
  const confirmOff = allPacked || blocked;
  const confirmTip = blocked ? `${order.canceled ? 'Canceled' : 'Closed'} orders cannot be packed` : allPacked ? 'Everything is packed' : '';
  return (
    <CardShell title="Packing & slip" icon="check">
      <CardBody>
        <button type="button" disabled={confirmOff} title={confirmTip} onClick={() => p.openConfirmPacked(order)} className={`inline-flex h-7 w-full min-w-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-lg border px-2 text-[11px] font-bold disabled:cursor-not-allowed cursor-pointer ${confirmOff ? 'border-orders-border bg-orders-surface-muted text-orders-text-subtle' : 'border-transparent bg-orders-primary text-white hover:bg-orders-primary-hover'}`}>
          <Icon name="check" className="h-3.5 w-3.5" />{allPacked ? `All ${total} items packed` : 'Confirm packed'}
        </button>
        {history.length === 0 ? (
          <div className="rounded-[7px] border border-orders-border bg-orders-surface-muted px-2 py-[3px] text-[10.5px] text-orders-text-subtle">No packing history.</div>
        ) : (
          <div className="flex max-h-[68px] flex-col gap-1 overflow-y-auto">
            {history.map((c) => {
              const items = c.lines.reduce((sum, l) => sum + l.quantity, 0);
              return (
                <div key={c.id} className="flex items-center justify-between gap-1 rounded-[7px] border border-orders-border bg-orders-surface-muted py-[3px] pl-[7px] pr-0.5 text-[10.5px] text-orders-text-body">
                  <span className="min-w-0 truncate"><b>Packed {when(c.confirmedAt)}</b><br /><span className="text-orders-text-subtle">{items} item{items === 1 ? '' : 's'}</span></span>
                  <button type="button" aria-label="Cancel this packed confirmation" title="Cancel confirmation (sends notification)" onClick={() => p.openCancelPacked(order, c.id)} className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md text-orders-text-subtle hover:bg-orders-divider hover:text-orders-text cursor-pointer"><Icon name="trash" className="h-3.5 w-3.5" /></button>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </CardShell>
  );
}
