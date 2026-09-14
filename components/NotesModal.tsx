'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { NoteModalState, NoteRecord, OrderRef } from '@/hooks/useOrderNotes';

type Props<O extends OrderRef> = {
  state: NoteModalState<O>;
  setState: Dispatch<SetStateAction<NoteModalState<O> | null>>;
  onClose: () => void;
  onSubmit: () => void;
  onStartEdit: (note: NoteRecord) => void;
  onCancelEdit: () => void;
  onDelete: (noteId: string) => void;
};

export default function NotesModal<O extends OrderRef>({ state, setState, onClose, onSubmit, onStartEdit, onCancelEdit, onDelete }: Props<O>) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 px-4 pb-4 sm:items-center sm:pb-0" role="dialog" aria-modal="true" aria-labelledby="order-notes-title" onClick={onClose}>
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div>
            <h3 id="order-notes-title" className="text-base font-semibold text-gray-900">Order notes</h3>
            <p className="mt-1 text-sm text-gray-500">Order {state.order.number} · {state.order.customer}</p>
          </div>
          <button type="button" onClick={onClose} disabled={state.saving || Boolean(state.deletingId)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer" aria-label="Close">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto px-5 py-4">
          {state.loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading notes...</div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
              <div className="space-y-3">
                <label className="block text-sm text-gray-700">
                  <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">{state.editingNoteId ? 'Update note' : 'Add note'}</span>
                  <textarea
                    value={state.note}
                    onChange={(e) => setState((prev) => prev ? { ...prev, note: e.target.value, error: '' } : prev)}
                    rows={8}
                    maxLength={5000}
                    disabled={state.saving}
                    placeholder="Write a note for this order"
                    className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
                  />
                </label>
                {state.error && <p className="text-sm text-red-600">{state.error}</p>}
                <div className="flex items-center gap-2">
                  {state.editingNoteId && (
                    <button type="button" onClick={onCancelEdit} disabled={state.saving} className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
                  )}
                  <button type="button" onClick={onSubmit} disabled={state.saving} className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                    {state.saving ? 'Saving...' : state.editingNoteId ? 'Update Note' : 'Add Note'}
                  </button>
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Notes</h4>
                {state.notes.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-400">No notes added yet.</div>
                ) : (
                  <div className="space-y-3">
                    {state.notes.map((note) => {
                      const wasEdited = note.updatedAt !== note.createdAt;
                      return (
                        <div key={note.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-800">{note.authorName || note.authorEmail || 'Unknown user'}</p>
                              {note.authorEmail && note.authorName && <p className="truncate text-xs text-gray-500">{note.authorEmail}</p>}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button type="button" onClick={() => onStartEdit(note)} disabled={state.saving || Boolean(state.deletingId)} className="rounded-lg px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">Edit</button>
                              <button type="button" onClick={() => onDelete(note.id)} disabled={state.saving || Boolean(state.deletingId)} className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">{state.deletingId === note.id ? 'Deleting...' : 'Delete'}</button>
                            </div>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700">{note.note}</p>
                          <p className="mt-2 text-xs text-gray-400">
                            {new Date(note.createdAt).toLocaleString()}
                            {wasEdited && ` · Edited ${new Date(note.updatedAt).toLocaleString()}`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
