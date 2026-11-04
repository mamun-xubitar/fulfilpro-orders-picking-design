'use client';

import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { PendingFulfillmentModalState } from '../types';
import { getFulfilledQty } from '../utils';
import { Icon } from '../queue/icons';
import DialogShell from './DialogShell';
import { dlgBtn, dlgInput, Field } from './dialogUi';

type Props = {
  modal: PendingFulfillmentModalState;
  setModal: Dispatch<SetStateAction<PendingFulfillmentModalState | null>>;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  carrierOpen: boolean;
  setCarrierOpen: Dispatch<SetStateAction<boolean>>;
  carrierSearch: string;
  setCarrierSearch: Dispatch<SetStateAction<string>>;
  carriers: readonly string[];
  trackingInputRef: RefObject<HTMLInputElement | null>;
};

/** Confirm fulfilment: lines, barcodes, carrier and tracking, customer notification. Staff can lower the quantities here. */
export default function FulfilConfirmDialog({ modal, setModal, saving, onClose, onConfirm, carrierOpen, setCarrierOpen, carrierSearch, setCarrierSearch, carriers, trackingInputRef }: Props) {
  const patch = (next: Partial<PendingFulfillmentModalState>) => setModal((prev) => (prev ? { ...prev, ...next } : prev));
  return (
    <DialogShell
      title="Confirm fulfilment"
      sub={`#${modal.order.number}`}
      width={520}
      busy={saving}
      onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} disabled={saving} className={dlgBtn.ghost}>Cancel</button>
        <button type="button" onClick={() => void onConfirm()} disabled={saving} className={dlgBtn.pri}>{saving ? 'Confirming…' : 'Confirm fulfilment'}</button>
      </>}
    >
      <div className="flex flex-col gap-2">
        <p className="text-orders-text-muted">After confirming, these items cannot be changed without admin permission.</p>
        <Field label="Items to fulfil">
          <div className="flex flex-col gap-0.5 rounded-[7px] border border-orders-border bg-orders-surface-muted p-1.5">
            {modal.lines.map((line) => {
              const item = modal.order.items.find((i) => i.id === line.lineItemId);
              const max = item ? Math.max(0, item.qty - getFulfilledQty(modal.order, item.id)) : line.quantity;
              const setQty = (quantity: number) => setModal((prev) => (prev ? { ...prev, lines: prev.lines.map((l) => (l.lineItemId === line.lineItemId ? { ...l, quantity, full: quantity === max } : l)) } : prev));
              return (
                <div key={line.lineItemId} className="flex items-center justify-between gap-3">
                  <span className="truncate">{item?.name ?? line.lineItemId}</span>
                  {modal.editable ? (
                    <span className="inline-flex h-6 items-center overflow-hidden rounded-[7px] border border-orders-border-strong bg-orders-surface">
                      <button type="button" aria-label="Decrease quantity" disabled={line.quantity <= 0} onClick={() => setQty(line.quantity - 1)} className="h-full w-[22px] text-[13px] font-bold text-orders-text-muted hover:bg-orders-divider disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer">−</button>
                      <span className="min-w-9 border-x border-orders-border text-center text-[11.5px] font-bold tabular-nums leading-[22px]">{line.quantity}<span className="font-normal text-orders-text-subtle">/{max}</span></span>
                      <button type="button" aria-label="Increase quantity" disabled={line.quantity >= max} onClick={() => setQty(line.quantity + 1)} className="h-full w-[22px] text-[13px] font-bold text-orders-text-muted hover:bg-orders-divider disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer">+</button>
                    </span>
                  ) : <b className="tabular-nums">× {line.quantity}</b>}
                </div>
              );
            })}
          </div>
        </Field>
        <Field label="Barcodes (space separated)">
          <span className="relative block">
            <Icon name="scan" className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-orders-text-subtle" />
            <input type="text" value={modal.barcodeInput} onChange={(e) => patch({ barcodeInput: e.target.value })} placeholder="Scan or type barcodes" className={`${dlgInput} pl-7`} />
          </span>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-[3px]">
            <span className="text-[9.5px] font-bold uppercase tracking-[.4px] text-orders-text-subtle">Carrier</span>
            <div className="relative">
              <button type="button" onClick={() => { setCarrierOpen((v) => !v); setCarrierSearch(''); }} aria-haspopup="listbox" aria-expanded={carrierOpen} className={`${dlgInput} flex items-center justify-between gap-2 text-left cursor-pointer ${carrierOpen ? 'border-orders-primary shadow-[0_0_0_2px_var(--orders-primary-ring)]' : ''}`}>
                <span className={modal.trackingCompany ? 'truncate text-orders-text' : 'text-orders-text-subtle'}>{modal.trackingCompany || 'Select carrier'}</span>
                <Icon name="chevronDown" className={`h-2.5 w-2.5 shrink-0 text-orders-text-subtle transition-transform ${carrierOpen ? 'rotate-180' : ''}`} />
              </button>
              {carrierOpen && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-orders-border bg-orders-surface shadow-orders-md">
                  <div className="border-b border-orders-divider p-1.5"><input type="text" value={carrierSearch} onChange={(e) => setCarrierSearch(e.target.value)} placeholder="Search carrier" autoFocus className={dlgInput} /></div>
                  <div className="max-h-44 overflow-y-auto py-1" role="listbox">
                    {carriers.length > 0 ? carriers.map((carrier, i) => (
                      <button key={`${carrier}-${i}`} type="button" role="option" aria-selected={modal.trackingCompany === carrier} onClick={() => { patch({ trackingCompany: carrier }); setCarrierOpen(false); setCarrierSearch(''); }} className={`w-full px-2.5 py-1.5 text-left hover:bg-orders-primary-soft cursor-pointer ${modal.trackingCompany === carrier ? 'bg-orders-primary-soft font-bold text-orders-primary-ink' : 'text-orders-text-body'}`}>{carrier}</button>
                    )) : <div className="px-2.5 py-2 text-orders-text-subtle">No carriers found.</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
          <Field label={`Tracking number${modal.trackingCompany.trim() ? ' *' : ''}`}>
            <input type="text" ref={trackingInputRef} value={modal.trackingNumber} required={Boolean(modal.trackingCompany.trim())} onChange={(e) => patch({ trackingNumber: e.target.value })} placeholder="Required with a carrier" className={dlgInput} />
          </Field>
        </div>
        <Field label="Tracking URL (optional)">
          <input type="url" value={modal.trackingUrl} onChange={(e) => patch({ trackingUrl: e.target.value })} placeholder="https://" className={dlgInput} />
        </Field>
        <label className="mt-1 flex cursor-pointer items-center gap-1.5 text-[10.5px] font-semibold text-orders-text-body">
          <input type="checkbox" checked={modal.notifyCustomer} onChange={(e) => patch({ notifyCustomer: e.target.checked })} className="h-[13px] w-[13px] cursor-pointer rounded-[3px] border-orders-border-strong text-orders-primary" />
          Send notification to customer
        </label>
      </div>
    </DialogShell>
  );
}
