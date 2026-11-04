'use client';

import { Fragment, type Dispatch, type SetStateAction } from 'react';
import DialogShell from '../dialogs/DialogShell';
import { dlgBtn } from '../dialogs/dialogUi';
import { clampNumber, createLocationRemark, getRemainingToPack, getVariantText, type PrintItem, type PrintOrder } from '../slipDocument';
import { Icon } from './icons';

type SetOrders = Dispatch<SetStateAction<PrintOrder[] | null>>;

const field = 'w-full rounded-md border border-orders-border-strong bg-orders-surface px-2 text-[11px] outline-none placeholder:text-orders-text-subtle focus:border-orders-primary disabled:bg-orders-canvas';

function patchItem(setOrders: SetOrders, orderId: string, itemId: string, patch: Partial<PrintItem>) {
  setOrders((prev) => (prev ? prev.map((o) => (o.id === orderId ? { ...o, printItems: o.printItems.map((item) => (item.id === itemId ? { ...item, ...patch } : item)) } : o)) : prev));
}

function LocationRemarks({ orderId, item, setOrders }: { orderId: string; item: PrintItem; setOrders: SetOrders }) {
  const update = (next: PrintItem['locationRemarks']) => patchItem(setOrders, orderId, item.id, { locationRemarks: next });
  const entries = item.locationRemarks;
  return (
    <div className="space-y-1">
      {entries.map((entry, idx) => {
        const last = idx === entries.length - 1;
        const set = (patch: Partial<typeof entry>) => update(entries.map((e) => (e.id === entry.id ? { ...e, ...patch } : e)));
        return (
          <div key={entry.id} className="grid grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)_auto] items-center gap-1.5">
            <input value={entry.location} disabled={item.removed} onChange={(e) => set({ location: e.target.value })} placeholder="Location" aria-label="Location" className={`${field} h-6`} />
            <input value={entry.remark} disabled={item.removed} onChange={(e) => set({ remark: e.target.value })} placeholder="Remark (shown on the slip)" aria-label="Remark" className={`${field} h-6`} />
            <button type="button" disabled={item.removed || (!last && entries.length <= 1)} aria-label={last ? 'Add location remark' : 'Remove location remark'} onClick={() => update(last ? [...entries, createLocationRemark()] : entries.filter((e) => e.id !== entry.id))} className="flex h-6 w-6 items-center justify-center rounded-md border border-orders-border-strong text-orders-text-muted hover:bg-orders-primary-soft hover:text-orders-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer">
              <Icon name={last ? 'plus' : 'minus'} className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

type Props = { orders: PrintOrder[]; setOrders: SetOrders; onClose: () => void; onPrint: () => void };

export default function PrintSlipModal({ orders, setOrders, onClose, onPrint }: Props) {
  return (
    <DialogShell
      title="Print picking slip"
      sub={`${orders.length} order${orders.length === 1 ? '' : 's'} · ${orders.reduce((n, o) => n + o.printItems.length, 0)} lines`}
      width={560}
      onClose={onClose}
      footer={<>
        <span className="mr-auto self-center text-[10px] text-orders-text-subtle">After printing, the slip icon turns green</span>
        <button type="button" onClick={onClose} className={dlgBtn.ghost}>Cancel</button>
        <button type="button" onClick={onPrint} className={dlgBtn.pri}><Icon name="printer" className="h-3.5 w-3.5" />Print</button>
      </>}
    >
      <div className="flex flex-col gap-2.5">
        {orders.map((order) => (
          <section key={order.id} className="rounded-[9px] border border-orders-border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orders-divider bg-orders-surface-muted px-2.5 py-1.5">
              <span className="flex items-center gap-1.5"><b className="text-orders-text">#{order.number}</b><span className="text-orders-text-subtle">{order.storeName}</span></span>
              <span className="text-[10.5px] text-orders-text-subtle">{order.customer} · print date {new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
            <div className="px-2.5">
              {order.printItems.map((item, idx) => (
                <Fragment key={`${order.id}-print-${item.id}-${idx}`}>
                  <div className={`flex flex-col gap-1.5 border-b border-orders-divider py-2 last:border-b-0 ${item.removed ? 'opacity-40' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0"><b className="block truncate text-orders-text">{item.title || item.name}</b><span className="block truncate text-[10px] text-orders-text-subtle">{getVariantText(item) || '-'}{item.sku ? ` · ${item.sku}` : ''}</span></span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span className="inline-flex h-6 items-center overflow-hidden rounded-[7px] border border-orders-border-strong bg-orders-surface">
                          <button type="button" aria-label="Decrease quantity" disabled={item.removed || item.printQuantity <= 1} onClick={() => patchItem(setOrders, order.id, item.id, { printQuantity: Math.max(1, item.printQuantity - 1) })} className="h-full w-[22px] text-[13px] font-bold text-orders-text-muted hover:bg-orders-divider disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer">−</button>
                          <input type="number" min={1} max={getRemainingToPack(item)} value={item.printQuantity} disabled={item.removed} aria-label="Quantity on the slip" onChange={(e) => patchItem(setOrders, order.id, item.id, { printQuantity: clampNumber(e.target.value, getRemainingToPack(item), 1) })} className="h-[22px] w-9 border-x border-orders-border bg-transparent text-center text-[11.5px] font-bold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                          <button type="button" aria-label="Increase quantity" disabled={item.removed || item.printQuantity >= getRemainingToPack(item)} onClick={() => patchItem(setOrders, order.id, item.id, { printQuantity: Math.min(getRemainingToPack(item), item.printQuantity + 1) })} className="h-full w-[22px] text-[13px] font-bold text-orders-text-muted hover:bg-orders-divider disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer">+</button>
                        </span>
                        <button type="button" onClick={() => patchItem(setOrders, order.id, item.id, { removed: !item.removed })} className={`${dlgBtn.xs} ${item.removed ? 'border-orders-primary-ring bg-orders-primary-soft text-orders-primary-ink' : 'border-orders-border-strong bg-orders-surface text-orders-text-body hover:bg-orders-surface-muted'}`}>{item.removed ? 'Restore' : 'Remove'}</button>
                      </span>
                    </div>
                    <LocationRemarks orderId={order.id} item={item} setOrders={setOrders} />
                    <input value={item.printNote} disabled={item.removed} onChange={(e) => patchItem(setOrders, order.id, item.id, { printNote: e.target.value })} placeholder="Note printed under this line (optional)" aria-label="Note" className={`${field} h-6`} />
                  </div>
                </Fragment>
              ))}
            </div>
          </section>
        ))}
      </div>
    </DialogShell>
  );
}
