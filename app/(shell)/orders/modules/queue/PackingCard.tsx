'use client';

import type { OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import { CardShell } from './ItemsCard';
import { Icon } from './icons';

const dateTime = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });

/** Confirm packed + print picking slip + packing history (Admin, Order Picker). */
export default function PackingCard({ p, order }: { p: OrdersPageBundle; order: OrderRow }) {
  const { caps } = p;
  const total = order.totalQuantity;
  const allPacked = total > 0 && order.packedQuantity >= total;
  const blocked = order.canceled || order.closed;
  const history = (order.packingConfirmations ?? []).filter((c) => !c.canceledAt);
  const shown = caps.packedDate ? history.slice(0, 5) : history.slice(0, 1);
  const printed = Boolean(order.slipPrinted);
  const confirmOff = allPacked || blocked;
  const confirmTip = blocked ? `${order.canceled ? 'Canceled' : 'Closed'} orders cannot be packed` : allPacked ? 'Everything is packed' : '';
  return (
    <CardShell title="Packing & slip" icon="printer">
      <div className="flex flex-col gap-2 p-3">
        <div className="flex gap-1.5">
          <button type="button" disabled={confirmOff} title={confirmTip} onClick={() => p.openConfirmPacked(order)} className={`flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border px-2 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed cursor-pointer ${confirmOff ? 'border-orders-border bg-orders-canvas text-orders-text-subtle' : 'border-orders-primary bg-orders-primary text-white hover:bg-orders-primary-hover'}`}>
            <Icon name="check" className="h-3.5 w-3.5" />{allPacked ? `All ${total} items packed` : 'Confirm packed'}
          </button>
          <button type="button" disabled={allPacked} title={allPacked ? 'Everything is packed' : printed ? 'Picking slip printed: print again' : 'Print picking slip'} onClick={() => p.openPrintModal([order])} className={`flex h-8 items-center justify-center gap-1 rounded-lg border px-2 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed cursor-pointer ${allPacked ? 'border-orders-border bg-orders-canvas text-orders-text-subtle' : printed ? 'border-orders-success-border bg-orders-success-soft text-orders-success-ink hover:brightness-95' : 'border-orders-primary-ring bg-orders-primary-soft text-orders-primary-ink hover:brightness-95'}`}>
            <Icon name={printed ? 'check' : 'printer'} className="h-3.5 w-3.5" />{printed ? 'Reprint slip' : 'Print slip'}
          </button>
        </div>
        {shown.length === 0 ? (
          <div className="rounded-lg border border-orders-divider bg-orders-surface-muted px-2 py-1.5 text-[10.5px] text-orders-text-muted">No packing history.</div>
        ) : shown.map((c) => {
          const items = c.lines.reduce((sum, l) => sum + l.quantity, 0);
          return (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-orders-divider bg-orders-surface-muted px-2 py-1 text-[10.5px] text-orders-text-body">
              <span><b>Packed {dateTime(c.confirmedAt)}</b> · {items} item{items === 1 ? '' : 's'}</span>
              <button type="button" aria-label="Cancel this packed confirmation" title="Cancel confirmation (sends a notification)" onClick={() => p.openCancelPacked(order, c.id)} className="rounded p-1 text-orders-text-subtle hover:bg-orders-danger-soft hover:text-orders-danger cursor-pointer"><Icon name="trash" className="h-3.5 w-3.5" /></button>
            </div>
          );
        })}
        {caps.admin && (
          <button type="button" onClick={() => void p.pickerMessages.openMessageModal(order)} className="flex h-6 items-center justify-center gap-1 rounded-lg border border-orders-border-strong bg-orders-surface text-[10.5px] font-semibold text-orders-text-body hover:bg-orders-surface-muted cursor-pointer"><Icon name="chat" className="h-3 w-3" />Picker messages</button>
        )}
      </div>
    </CardShell>
  );
}
