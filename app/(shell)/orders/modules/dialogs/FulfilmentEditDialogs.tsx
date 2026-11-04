'use client';

import type { Dispatch, SetStateAction } from 'react';
import { SHOPIFY_TRACKING_CARRIERS } from '../constants';
import type { CancelFulfillmentModalState, EditFulfillmentModalState, RequestPermissionModalState, TrackingActionModalState } from '../types';
import { Icon } from '../queue/icons';
import DialogShell from './DialogShell';
import { dlgBtn, dlgInput, dlgTextarea, Field, FormError } from './dialogUi';

/** Edit a fulfilment: barcodes, date, carrier and tracking (Admin, or Staff once approved). */
export function EditFulfilmentDialog({ modal, setModal, onSubmit }: { modal: EditFulfillmentModalState; setModal: Dispatch<SetStateAction<EditFulfillmentModalState | null>>; onSubmit: () => Promise<void> }) {
  const patch = (next: Partial<EditFulfillmentModalState>) => setModal((p) => (p ? { ...p, ...next } : null));
  return (
    <DialogShell elevated title="Edit fulfilment" sub={`#${modal.order.number}`} width={460} busy={modal.saving} onClose={() => setModal(null)}
      footer={<>
        <button type="button" onClick={() => setModal(null)} disabled={modal.saving} className={dlgBtn.ghost}>Cancel</button>
        <button type="button" onClick={() => void onSubmit()} disabled={modal.saving} className={dlgBtn.pri}>{modal.saving ? 'Saving…' : 'Save changes'}</button>
      </>}>
      <div className="flex flex-col gap-2">
        {modal.error && <FormError>{modal.error}</FormError>}
        <Field label="Barcodes (space separated)"><input type="text" value={modal.barcodes} onChange={(e) => patch({ barcodes: e.target.value })} placeholder="barcode1 barcode2" className={dlgInput} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Fulfilment date"><input type="date" value={modal.fulfillmentDate} onChange={(e) => patch({ fulfillmentDate: e.target.value })} className={dlgInput} /></Field>
          <Field label="Carrier">
            <input type="text" value={modal.carrier} onChange={(e) => patch({ carrier: e.target.value })} list="edit-ful-carriers" placeholder="e.g. Australia Post" className={dlgInput} />
            <datalist id="edit-ful-carriers">{SHOPIFY_TRACKING_CARRIERS.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
        </div>
        <Field label="Tracking number"><input type="text" value={modal.trackingNumber} onChange={(e) => patch({ trackingNumber: e.target.value })} placeholder="Enter tracking number" className={dlgInput} /></Field>
        <Field label="Tracking URL"><input type="url" value={modal.trackingUrl} onChange={(e) => patch({ trackingUrl: e.target.value })} placeholder="https://" className={dlgInput} /></Field>
      </div>
    </DialogShell>
  );
}

/** Cancel a fulfilment (Admin, or Staff once approved). */
export function CancelFulfilmentDialog({ modal, setModal, onSubmit }: { modal: CancelFulfillmentModalState; setModal: Dispatch<SetStateAction<CancelFulfillmentModalState | null>>; onSubmit: () => Promise<void> }) {
  return (
    <DialogShell elevated title="Cancel fulfilment" sub={`#${modal.order.number}`} width={400} busy={modal.saving} onClose={() => setModal(null)}
      footer={<>
        <button type="button" onClick={() => setModal(null)} disabled={modal.saving} className={dlgBtn.ghost}>Go back</button>
        <button type="button" onClick={() => void onSubmit()} disabled={modal.saving} className="inline-flex h-7 items-center justify-center whitespace-nowrap rounded-lg border border-transparent bg-orders-danger px-[9px] text-[11px] font-bold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer">{modal.saving ? 'Cancelling…' : 'Yes, cancel fulfilment'}</button>
      </>}>
      <div className="flex flex-col gap-2">
        {modal.error && <FormError>{modal.error}</FormError>}
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orders-danger-soft text-orders-danger"><Icon name="lock" className="h-4 w-4" /></span>
          <div><b className="block text-orders-text">Are you sure?</b><p className="mt-0.5 text-orders-text-muted">This cancels the fulfilment and removes it from this order. This cannot be undone.</p></div>
        </div>
      </div>
    </DialogShell>
  );
}

/** Staff ask an admin for permission to edit or cancel a fulfilment. */
export function RequestPermissionDialog({ modal, setModal, onSubmit }: { modal: RequestPermissionModalState; setModal: Dispatch<SetStateAction<RequestPermissionModalState | null>>; onSubmit: () => Promise<void> }) {
  const toggle = (id: string) => setModal((prev) => {
    if (!prev) return null;
    return { ...prev, selectedAdminIds: prev.selectedAdminIds.includes(id) ? prev.selectedAdminIds.filter((x) => x !== id) : [...prev.selectedAdminIds, id] };
  });
  return (
    <DialogShell elevated title={`Request ${modal.requestType === 'edit' ? 'edit' : 'cancel'} permission`} sub={`#${modal.order.number}`} width={400} busy={modal.saving} onClose={() => setModal(null)}
      footer={<>
        <button type="button" onClick={() => setModal(null)} disabled={modal.saving} className={dlgBtn.ghost}>Cancel</button>
        <button type="button" onClick={() => void onSubmit()} disabled={modal.saving || modal.loadingAdmins} className={dlgBtn.pri}>{modal.saving ? 'Submitting…' : 'Submit request'}</button>
      </>}>
      <div className="flex flex-col gap-2">
        {modal.error && <FormError>{modal.error}</FormError>}
        <div className="flex flex-col gap-[3px]">
          <span className="text-[9.5px] font-bold uppercase tracking-[.4px] text-orders-text-subtle">Notify admin(s) *</span>
          {modal.loadingAdmins ? <span className="text-orders-text-subtle">Loading admins…</span> : (
            <div className="flex max-h-36 flex-col overflow-y-auto rounded-[7px] border border-orders-border bg-orders-surface-muted px-2 py-1">
              {modal.availableAdmins.map((admin) => (
                <label key={admin.id} className="flex cursor-pointer items-center gap-2 py-1">
                  <input type="checkbox" checked={modal.selectedAdminIds.includes(admin.id)} onChange={() => toggle(admin.id)} className="h-[13px] w-[13px] cursor-pointer rounded-[3px] border-orders-border-strong text-orders-primary" />
                  <b className="font-semibold text-orders-text">{admin.name}</b><span className="text-orders-text-subtle">{admin.email}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <Field label="Reason *" hint={`${modal.reason.length}/2000`}>
          <textarea value={modal.reason} onChange={(e) => setModal((p) => (p ? { ...p, reason: e.target.value } : null))} rows={4} maxLength={2000} placeholder="Explain why you need this permission…" className={dlgTextarea} />
        </Field>
      </div>
    </DialogShell>
  );
}

const TRACKING_TITLE = { register: 'Register tracking', pause: 'Pause tracking', restart: 'Restart tracking' } as const;

/** Register, pause or restart 17track tracking for an order (Admin). */
export function TrackingDialog({ modal, onClose, onSubmit }: { modal: TrackingActionModalState; onClose: () => void; onSubmit: () => Promise<void> }) {
  const label = TRACKING_TITLE[modal.action as keyof typeof TRACKING_TITLE] ?? 'Tracking';
  const number = modal.tracking?.trackingNumber ?? 'this shipment';
  return (
    <DialogShell title="Tracking" sub={`#${modal.order.number}`} width={400} busy={modal.saving} onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} disabled={modal.saving} className={dlgBtn.ghost}>Close</button>
        <button type="button" onClick={() => void onSubmit()} disabled={modal.saving} className={dlgBtn.pri}>{modal.saving ? 'Saving…' : label}</button>
      </>}>
      <div className="flex flex-col gap-2">
        {modal.error && <FormError>{modal.error}</FormError>}
        <p className="text-orders-text-body">
          {modal.action === 'register' ? 'Register all tracking numbers for this order with 17track to enable automated shipment tracking.'
            : modal.action === 'pause' ? `Pause tracking for ${number}. No further updates will be fetched until restarted.`
            : `Restart tracking for ${number}.`}
        </p>
      </div>
    </DialogShell>
  );
}
