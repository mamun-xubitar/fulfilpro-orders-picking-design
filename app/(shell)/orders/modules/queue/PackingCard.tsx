'use client';

import type { OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import { CardBody, CardShell } from './ItemsCard';
import { Icon } from './icons';

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

/** Packing & slip (prototype `packBox`): Confirm packed + Print Slip in one row, then the packing history. */
export default function PackingCard({ p, order }: { p: OrdersPageBundle; order: OrderRow }) {
  const total = order.totalQuantity;
  const allPacked = total > 0 && order.packedQuantity >= total;
  const blocked = order.canceled || order.closed;
  const history = (order.packingConfirmations ?? []).filter((c) => !c.canceledAt);
  const printed = Boolean(order.slipPrinted);
  const confirmOff = allPacked || blocked;
  const confirmTip = blocked ? `${order.canceled ? 'Canceled' : 'Closed'} orders cannot be packed` : allPacked ? 'Everything is packed' : '';
  return (
    <CardShell title="Packing & slip" icon="check">
      <CardBody>
        <div className="flex gap-[5px]">
          <button type="button" disabled={confirmOff} title={confirmTip} onClick={() => p.openConfirmPacked(order)} className={`inline-flex h-7 min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-lg border px-2 text-[11px] font-bold disabled:cursor-not-allowed cursor-pointer ${confirmOff ? 'border-orders-border bg-orders-surface-muted text-orders-text-subtle' : 'border-transparent bg-orders-primary text-white hover:bg-orders-primary-hover'}`}>
            <Icon name="check" className="h-3.5 w-3.5" />{allPacked ? `All ${total} items packed` : 'Confirm packed'}
          </button>
          <button type="button" disabled={allPacked} title={allPacked ? 'Everything is packed' : printed ? 'Picking slip printed: print again' : 'Print picking slip'} onClick={() => p.openPrintModal([order])} className={`inline-flex h-7 flex-none items-center justify-center gap-1 whitespace-nowrap rounded-lg border px-2 text-[11px] font-bold disabled:cursor-not-allowed cursor-pointer ${allPacked ? 'border-orders-border bg-orders-surface-muted text-orders-text-subtle' : printed ? 'border-orders-success-border bg-orders-success-soft text-orders-success-ink hover:brightness-95' : 'border-orders-primary-ring bg-orders-primary-soft text-orders-primary-ink hover:brightness-95'}`}>
            <Icon name={printed ? 'check' : 'printer'} className="h-3.5 w-3.5" />{printed ? 'Reprint Slip' : 'Print Slip'}
          </button>
        </div>
        {history.length === 0 ? (
          <div className="rounded-[7px] border border-orders-border bg-orders-surface-muted px-2 py-[3px] text-[10.5px] text-orders-text-subtle">No packing history.</div>
        ) : (
          <div className="flex max-h-[68px] flex-col gap-1 overflow-y-auto">
            {history.map((c) => {
              const items = c.lines.reduce((sum, l) => sum + l.quantity, 0);
              return (
                <div key={c.id} className="flex items-center justify-between gap-1.5 rounded-[7px] border border-orders-border bg-orders-surface-muted py-[3px] pl-2 pr-1 text-[10.5px] text-orders-text-body">
                  <span><b>Packed {when(c.confirmedAt)}</b> · {items} item{items === 1 ? '' : 's'}</span>
                  <button type="button" aria-label="Cancel this packed confirmation" title="Cancel confirmation (sends notification)" onClick={() => p.openCancelPacked(order, c.id)} className="flex h-6 w-6 items-center justify-center rounded-md text-orders-text-subtle hover:bg-orders-divider hover:text-orders-text cursor-pointer"><Icon name="trash" className="h-3.5 w-3.5" /></button>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </CardShell>
  );
}
