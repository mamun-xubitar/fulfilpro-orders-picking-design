'use client';

import type { Dispatch, SetStateAction } from 'react';
import DialogShell from '../dialogs/DialogShell';
import { dlgBtn, dlgTextarea, Field } from '../dialogs/dialogUi';
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
    <DialogShell
      title={confirm ? 'Confirm packed' : 'Cancel packed'}
      sub={`Order #${state.order.number} · ${confirm ? `${(state.lines ?? []).reduce((s, l) => s + l.quantity, 0)} items` : 'the packing record is removed and the items go back to unpacked'}`}
      width={400}
      busy={state.saving}
      onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} disabled={state.saving} className={dlgBtn.ghost}>Back</button>
        <button type="button" onClick={onSubmit} disabled={state.saving} className={confirm ? dlgBtn.pri : dlgBtn.danger}>{state.saving ? 'Saving…' : confirm ? 'Confirm packed' : 'Cancel packed'}</button>
      </>}
    >
      <div className="flex flex-col gap-2">
        <Field label="Notify users" hint="All users are ticked by default. Each one gets an email and an in-app notification.">
          <span className="flex max-h-36 flex-col overflow-y-auto rounded-[7px] border border-orders-border bg-orders-surface-muted px-1.5 py-0.5">
            {recipients.length === 0 && <span className="px-1 py-1 text-orders-text-subtle">No users are set up to be notified.</span>}
            {recipients.map((r) => (
              <label key={r.id} className="flex cursor-pointer items-center gap-2 py-1">
                <input type="checkbox" checked={state.selectedUserIds.includes(r.id)} onChange={() => toggle(r.id)} className="h-[13px] w-[13px] cursor-pointer rounded-[3px] border-orders-border-strong text-orders-primary" />
                <b className="font-semibold text-orders-text">{r.name}</b><span className="text-orders-text-subtle">{r.email}</span>
              </label>
            ))}
          </span>
        </Field>
        <Field label="Message (optional email)">
          <textarea value={state.message} onChange={(e) => setState((prev) => (prev ? { ...prev, message: e.target.value } : prev))} rows={3} placeholder="Packed 3 of 8, the rest is waiting on stock…" className={dlgTextarea} />
        </Field>
      </div>
    </DialogShell>
  );
}
