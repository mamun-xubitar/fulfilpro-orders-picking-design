'use client';

import type { Dispatch, SetStateAction } from 'react';
import { ModalShell } from '@/components/ModalShell';
import type { PackingRecipient } from '../types';
import type { NotifyPackedState } from '../hooks/usePacking';

type Props = {
  state: NotifyPackedState;
  setState: Dispatch<SetStateAction<NotifyPackedState | null>>;
  recipients: PackingRecipient[];
  onClose: () => void;
  onSubmit: () => void;
};

/** Confirm or cancel a packed confirmation, choosing who is notified. */
export default function NotifyPackedModal({ state, setState, recipients, onClose, onSubmit }: Props) {
  const confirm = state.type === 'confirm';
  const toggle = (id: string) => setState((prev) => (prev ? { ...prev, selectedUserIds: prev.selectedUserIds.includes(id) ? prev.selectedUserIds.filter((x) => x !== id) : [...prev.selectedUserIds, id] } : prev));
  return (
    <ModalShell
      title={confirm ? 'Confirm packed' : 'Cancel packed'}
      onClose={state.saving ? () => undefined : onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} disabled={state.saving} className="rounded-lg border border-orders-border-strong bg-orders-surface px-3 py-1.5 text-[12px] font-semibold text-orders-text-body hover:bg-orders-surface-muted disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer">Back</button>
          <button type="button" onClick={onSubmit} disabled={state.saving} className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${confirm ? 'bg-orders-primary hover:bg-orders-primary-hover' : 'bg-orders-danger hover:brightness-110'}`}>{state.saving ? 'Saving…' : confirm ? 'Confirm packed' : 'Cancel packed'}</button>
        </div>
      }
    >
      <p className="mb-3 text-[11.5px] text-orders-text-muted">Order <b className="text-orders-text">#{state.order.number}</b> · {confirm ? `${(state.lines ?? []).reduce((s, l) => s + l.quantity, 0)} items` : 'the packing record is removed and the items go back to unpacked'}</p>
      <span className="mb-1 block text-[9.5px] font-bold uppercase text-orders-text-subtle">Notify users</span>
      <div className="max-h-44 space-y-0.5 overflow-y-auto rounded-lg border border-orders-border p-1.5">
        {recipients.length === 0 && <span className="px-2 text-[11px] text-orders-text-subtle">No users are set up to be notified.</span>}
        {recipients.map((r) => (
          <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-[11.5px] hover:bg-orders-surface-muted">
            <input type="checkbox" checked={state.selectedUserIds.includes(r.id)} onChange={() => toggle(r.id)} className="h-3.5 w-3.5 rounded border-orders-border-strong text-orders-primary cursor-pointer" />
            <b className="font-semibold text-orders-text">{r.name}</b><span className="text-orders-text-subtle">{r.email}</span>
          </label>
        ))}
      </div>
      <label className="mt-3 block">
        <span className="mb-1 block text-[9.5px] font-bold uppercase text-orders-text-subtle">Email message (optional)</span>
        <textarea value={state.message} onChange={(e) => setState((prev) => (prev ? { ...prev, message: e.target.value } : prev))} rows={4} className="w-full resize-none rounded-lg border border-orders-border-strong px-2.5 py-2 text-[12px] outline-none focus:border-orders-primary focus:ring-2 focus:ring-orders-primary-ring" />
      </label>
    </ModalShell>
  );
}
