'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { OrderStockAdjustment, StockAdjustmentModalState } from '../types';
import Badge from '../queue/Badge';
import DialogShell from './DialogShell';
import { dlgBtn, Hint } from './dialogUi';

function eventLabel(value: OrderStockAdjustment['lastEventType']) {
  if (value === 'fulfillment_canceled') return 'Fulfillment canceled';
  if (value === 'partially_fulfilled') return 'Partially fulfilled';
  return 'Fulfilled';
}

type Props = {
  modal: StockAdjustmentModalState;
  setModal: Dispatch<SetStateAction<StockAdjustmentModalState | null>>;
  onClose: () => void;
  onToggle: (lineItemId: string) => void;
  onSave: () => Promise<void>;
};

/** Manage stock adjustment (Admin): choose what happens to hub stock for each line of the order. */
export default function StockAdjustmentDialog({ modal, onClose, onToggle, onSave }: Props) {
  const a = modal.adjustment;
  return (
    <DialogShell
      title="Manage stock adjustment"
      sub={a ? `Order #${modal.order.number} · ${a.managedCount} of ${a.totalCount} lines managed` : `Order #${modal.order.number}`}
      width={460}
      busy={modal.saving}
      onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} disabled={modal.saving} className={dlgBtn.ghost}>Close</button>
        <button type="button" onClick={() => void onSave()} disabled={modal.saving || modal.loading || !a} className={dlgBtn.pri}>{modal.saving ? 'Saving…' : 'Save stock status'}</button>
      </>}
    >
      {modal.loading ? <Hint>Loading stock adjustment…</Hint> : !a ? <Hint>No stock adjustment is pending for this order.</Hint> : (
        <>
          <p className="mb-1.5 text-orders-text-subtle">Choose what happens to hub stock for each line of <b className="text-orders-text">#{modal.order.number}</b>. Last event: {eventLabel(a.lastEventType)} on {new Date(a.lastEventAt).toLocaleString()}.</p>
          <div className="grid h-[22px] grid-cols-[22px_1fr_96px_44px] items-center gap-2 border-b border-orders-border bg-orders-surface-muted px-2 text-[9px] font-bold uppercase tracking-[.4px] text-orders-text-subtle"><span /><span>Product</span><span>Action</span><span className="text-center">Qty</span></div>
          {a.items.map((item) => (
            <div key={item.lineItemId} className="grid min-h-9 grid-cols-[22px_1fr_96px_44px] items-center gap-2 border-b border-orders-divider px-2 last:border-b-0">
              <input type="checkbox" aria-label={`Managed: ${item.name}`} checked={modal.managedLineItemIds.includes(item.lineItemId)} onChange={() => onToggle(item.lineItemId)} disabled={modal.saving} className="h-[13px] w-[13px] cursor-pointer rounded-[3px] border-orders-border-strong text-orders-primary disabled:cursor-not-allowed disabled:opacity-50" />
              <span className="flex min-w-0 flex-col"><b className="truncate text-orders-text">{item.name}</b><span className="truncate text-[10px] text-orders-text-subtle">{[item.sku, item.vendor].filter(Boolean).join(' · ')}</span></span>
              <Badge tone={item.action === 'restore' ? 'prt' : 'warn'}>{item.action === 'restore' ? 'Restore' : 'Decrease'}</Badge>
              <b className="text-center tabular-nums">{item.quantity}</b>
            </div>
          ))}
          {modal.error && <p className="mt-2 text-[11px] text-orders-danger">{modal.error}</p>}
        </>
      )}
    </DialogShell>
  );
}
