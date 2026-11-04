'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { NoteModalState } from '../types';
import DialogShell from './DialogShell';
import { dlgBtn, dlgTextarea, Field, Hint, SegSwitch } from './dialogUi';

type Props = {
  modal: NoteModalState;
  setModal: Dispatch<SetStateAction<NoteModalState | null>>;
  onClose: () => void;
  onCancelEdit: () => void;
  onSubmit: () => Promise<void>;
  onStartEdit: (note: NoteModalState['notes'][number]) => void;
  onDelete: (noteId: string) => Promise<void>;
  /** Shows the Note | Message to admin toggle; switching closes this dialog and opens the messages one. */
  onSwitchToMessages?: () => void;
};

/** Order notes (internal team notes): add, edit and delete. */
export default function NotesDialog({ modal, setModal, onClose, onCancelEdit, onSubmit, onStartEdit, onDelete, onSwitchToMessages }: Props) {
  const busy = modal.saving || Boolean(modal.deletingId);
  return (
    <DialogShell
      title="Notes and messages"
      sub={`#${modal.order.number} · ${modal.order.customer}`}
      width={420}
      busy={busy}
      onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} disabled={busy} className={dlgBtn.ghost}>Close</button>
        {modal.editingNoteId && <button type="button" onClick={onCancelEdit} disabled={modal.saving} className={dlgBtn.ghost}>Cancel edit</button>}
        <button type="button" onClick={() => void onSubmit()} disabled={modal.saving || modal.loading} className={dlgBtn.pri}>{modal.saving ? 'Saving…' : modal.editingNoteId ? 'Update note' : 'Add note'}</button>
      </>}
    >
      {onSwitchToMessages && <SegSwitch active="note" onNote={() => undefined} onMessage={onSwitchToMessages} />}
      {modal.loading ? <Hint>Loading notes…</Hint> : (
        <div className="flex flex-col gap-2">
          <Field label={modal.editingNoteId ? 'Update note' : 'Note'}>
            <textarea value={modal.note} onChange={(e) => setModal((prev) => (prev ? { ...prev, note: e.target.value, error: '' } : prev))} rows={4} maxLength={5000} disabled={modal.saving} placeholder="Write a note for the team…" className={dlgTextarea} />
          </Field>
          {modal.error && <p className="text-[11px] text-orders-danger">{modal.error}</p>}
          <div className="flex flex-col gap-1">
            <span className="text-[9.5px] font-bold uppercase tracking-[.4px] text-orders-text-subtle">History</span>
            {modal.notes.length === 0 ? <p className="rounded-lg border border-dashed border-orders-border-strong px-3 py-4 text-center text-[11px] text-orders-text-subtle">No notes added yet.</p> : modal.notes.map((n) => (
              <div key={n.id} className="rounded-lg border border-orders-border bg-orders-surface-muted px-2 py-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0"><b className="block truncate text-orders-text">{n.authorName || n.authorEmail || 'Unknown user'}</b><span className="text-[10px] text-orders-text-subtle">{new Date(n.createdAt).toLocaleString()}{n.updatedAt !== n.createdAt && ` · Edited ${new Date(n.updatedAt).toLocaleString()}`}</span></span>
                  <span className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => onStartEdit(n)} disabled={busy} className="text-[10.5px] font-bold text-orders-primary-ink hover:underline disabled:opacity-50 cursor-pointer">Edit</button>
                    <button type="button" onClick={() => void onDelete(n.id)} disabled={busy} className="text-[10.5px] font-bold text-orders-danger hover:underline disabled:opacity-50 cursor-pointer">{modal.deletingId === n.id ? 'Deleting…' : 'Delete'}</button>
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-orders-text-body">{n.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </DialogShell>
  );
}
