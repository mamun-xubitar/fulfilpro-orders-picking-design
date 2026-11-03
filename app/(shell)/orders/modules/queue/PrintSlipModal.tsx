'use client';

import { Fragment, type Dispatch, type SetStateAction } from 'react';
import { ModalShell } from '@/components/ModalShell';
import { clampNumber, createLocationRemark, getRemainingToPack, getVariantText, type PrintItem, type PrintOrder } from '../slipDocument';
import { Icon } from './icons';

type SetOrders = Dispatch<SetStateAction<PrintOrder[] | null>>;

const field = 'w-full rounded border border-orders-border-strong bg-orders-surface px-2 py-1 text-[11.5px] disabled:bg-orders-canvas';
const label = 'mb-0.5 block text-[9.5px] font-bold uppercase text-orders-text-subtle';

function patchItem(setOrders: SetOrders, orderId: string, itemId: string, patch: Partial<PrintItem>) {
  setOrders((prev) => (prev ? prev.map((o) => (o.id === orderId ? { ...o, printItems: o.printItems.map((item) => (item.id === itemId ? { ...item, ...patch } : item)) } : o)) : prev));
}

function LocationRemarks({ orderId, item, setOrders }: { orderId: string; item: PrintItem; setOrders: SetOrders }) {
  const update = (next: PrintItem['locationRemarks']) => patchItem(setOrders, orderId, item.id, { locationRemarks: next });
  const entries = item.locationRemarks;
  return (
    <div className="mt-2 space-y-1.5">
      {entries.map((entry, idx) => {
        const last = idx === entries.length - 1;
        const set = (patch: Partial<typeof entry>) => update(entries.map((e) => (e.id === entry.id ? { ...e, ...patch } : e)));
        return (
          <div key={entry.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
            <label>{idx === 0 && <span className={label}>Location</span>}<input value={entry.location} disabled={item.removed} onChange={(e) => set({ location: e.target.value })} className={field} /></label>
            <label>{idx === 0 && <span className={label}>Remark</span>}<input value={entry.remark} disabled={item.removed} onChange={(e) => set({ remark: e.target.value })} className={field} /></label>
            <button type="button" disabled={item.removed || (!last && entries.length <= 1)} aria-label={last ? 'Add location remark' : 'Remove location remark'} onClick={() => update(last ? [...entries, createLocationRemark()] : entries.filter((e) => e.id !== entry.id))} className="flex h-7 w-7 items-center justify-center rounded border border-orders-border-strong text-orders-text-muted hover:bg-orders-primary-soft hover:text-orders-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer">
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
    <ModalShell
      title="Print picking slip"
      onClose={onClose}
      extraWide
      footer={
        <div className="flex items-center justify-end gap-2">
          <span className="mr-auto text-[10.5px] text-orders-text-subtle">After printing, the slip icon turns green.</span>
          <button type="button" onClick={onClose} className="rounded-lg border border-orders-border-strong bg-orders-surface px-3 py-1.5 text-[12px] font-semibold text-orders-text-body hover:bg-orders-surface-muted cursor-pointer">Cancel</button>
          <button type="button" onClick={onPrint} className="flex items-center gap-1.5 rounded-lg bg-orders-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-orders-primary-hover cursor-pointer"><Icon name="printer" className="h-3.5 w-3.5" />Print</button>
        </div>
      }
    >
      <p className="-mt-2 mb-3 text-[11.5px] text-orders-text-muted">{orders.length} order{orders.length === 1 ? '' : 's'}</p>
      <div className="space-y-4">
        {orders.map((order) => (
          <section key={order.id} className="rounded-lg border border-orders-border">
            <div className="flex flex-wrap justify-between gap-2 border-b border-orders-border bg-orders-surface-muted px-3 py-2">
              <div><b className="text-[12.5px] text-orders-text">{order.storeName}</b><div className="text-[11px] text-orders-text-muted">Order {order.number}</div></div>
              <div className="text-right text-[11px] text-orders-text-muted"><div>Print date: {new Date().toLocaleString()}</div><div>{order.customer}</div></div>
            </div>
            <div className="p-3">
              {order.printItems.map((item, idx) => (
                <Fragment key={`${order.id}-print-${item.id}-${idx}`}>
                  <div className={`grid grid-cols-[minmax(0,34%)_minmax(0,1fr)] gap-4 border-b border-orders-divider py-3 ${item.removed ? 'opacity-40' : ''}`}>
                    <div><div className="text-[12.5px] font-semibold text-orders-text">{item.title || item.name}</div><div className="mt-1 text-[11px] text-orders-text-muted"><b className="uppercase">SKU:</b> <span className="font-mono">{item.sku || '-'}</span></div></div>
                    <div>
                      <div className="grid grid-cols-[minmax(0,1fr)_5rem_2rem] items-end gap-3">
                        <div className="min-w-0"><span className={label}>Variant</span><div className="truncate text-[11.5px] text-orders-text-body">{getVariantText(item) || '-'}</div></div>
                        <label><span className={label}>Qty</span><input type="number" min={1} max={getRemainingToPack(item)} value={item.printQuantity} disabled={item.removed} onChange={(e) => patchItem(setOrders, order.id, item.id, { printQuantity: clampNumber(e.target.value, getRemainingToPack(item), 1) })} className={`${field} text-center`} /></label>
                        <button type="button" onClick={() => patchItem(setOrders, order.id, item.id, { removed: !item.removed })} aria-label={item.removed ? 'Restore item' : 'Remove item'} title={item.removed ? 'Restore item' : 'Remove item from the slip'} className={`flex h-7 w-7 items-center justify-center rounded border cursor-pointer ${item.removed ? 'border-orders-primary-ring bg-orders-primary-soft text-orders-primary' : 'border-orders-border-strong text-orders-text-muted hover:bg-orders-danger-soft hover:text-orders-danger'}`}><Icon name={item.removed ? 'refresh' : 'close'} className="h-3.5 w-3.5" /></button>
                      </div>
                      <LocationRemarks orderId={order.id} item={item} setOrders={setOrders} />
                      <label className="mt-2 block"><span className={label}>Note</span><textarea value={item.printNote} rows={2} disabled={item.removed} onChange={(e) => patchItem(setOrders, order.id, item.id, { printNote: e.target.value })} className={`${field} resize-none`} /></label>
                    </div>
                  </div>
                </Fragment>
              ))}
            </div>
          </section>
        ))}
      </div>
    </ModalShell>
  );
}
