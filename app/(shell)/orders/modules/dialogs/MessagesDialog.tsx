'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { MessageModalState, OrderRef } from '@/hooks/useOrderMessages';
import DialogShell from './DialogShell';
import { dlgBtn, dlgInput, dlgTextarea, Field, Hint, SegSwitch, SplitPane } from './dialogUi';

type Props<O extends OrderRef> = {
  state: MessageModalState<O>;
  setState: Dispatch<SetStateAction<MessageModalState<O> | null>>;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
  /** Shows the Note | Message toggle; switching closes this dialog and opens the notes one. */
  onSwitchToNotes?: () => void;
  title?: string;
};

/** Direct message to an admin (Admin / Staff: "orders" messages, Order Picker: "picker" messages). */
export default function MessagesDialog<O extends OrderRef>({ state, setState, onClose, onSubmit, onSwitchToNotes, title = 'Notes and messages' }: Props<O>) {
  return (
    <DialogShell
      title={title}
      sub={`#${state.order.number} · ${state.order.customer}`}
      width={720}
      busy={state.sending}
      onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} disabled={state.sending} className={dlgBtn.ghost}>Close</button>
        <button type="button" onClick={() => void onSubmit()} disabled={state.sending || state.loading || state.admins.length === 0} className={dlgBtn.pri}>{state.sending ? 'Sending…' : 'Send'}</button>
      </>}
    >
      {onSwitchToNotes && <SegSwitch active="message" onNote={onSwitchToNotes} onMessage={() => undefined} />}
      {state.loading ? <Hint>Loading messages…</Hint> : (
        <SplitPane
          form={<>
            <Field label="Recipient">
              <select value={state.selectedAdminId} onChange={(e) => setState((prev) => (prev ? { ...prev, selectedAdminId: e.target.value } : prev))} disabled={state.sending || state.admins.length === 0} className={dlgInput}>
                {state.admins.length === 0 ? <option value="">No active recipients</option> : state.admins.map((a) => <option key={a.id} value={a.id}>{a.name} - {a.email}</option>)}
              </select>
            </Field>
            <Field label="Message">
              <textarea value={state.message} onChange={(e) => setState((prev) => (prev ? { ...prev, message: e.target.value, error: '' } : prev))} rows={7} maxLength={5000} disabled={state.sending} placeholder="Write a message for the selected recipient" className={dlgTextarea} />
            </Field>
            {state.error && <p className="text-[11px] text-orders-danger">{state.error}</p>}
          </>}
          count={state.messages.length}
          history={state.messages.length === 0 ? <p className="rounded-lg border border-dashed border-orders-border-strong px-3 py-4 text-center text-[11px] text-orders-text-subtle">No messages sent yet.</p> : state.messages.map((m) => (
            <div key={m.id} className="rounded-lg border border-orders-border bg-orders-surface-muted px-2 py-1.5">
              <div className="flex items-start justify-between gap-2"><b className="truncate text-orders-text">{m.adminName}</b><span className="shrink-0 text-[10px] text-orders-text-subtle">{new Date(m.createdAt).toLocaleString()}</span></div>
              {(m.senderName || m.senderEmail) && <p className="text-[10px] text-orders-text-subtle">Sent by {[m.senderName, m.senderEmail].filter(Boolean).join(' - ')}</p>}
              <p className="mt-1 whitespace-pre-wrap break-words text-orders-text-body">{m.message}</p>
            </div>
          ))}
        />
      )}
    </DialogShell>
  );
}
