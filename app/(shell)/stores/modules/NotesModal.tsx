'use client';

import { useState } from 'react';
import { NoteType } from '@/models/store.model.server';

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeName: string;
  storeId: string;
  notes: NoteType[];
  onAddNote: (storeId: string, text: string) => Promise<void>;
  onEditNote: (storeId: string, noteId: number, text: string) => Promise<void>;
  onDeleteNote: (storeId: string, noteId: number) => Promise<void>;
  isLoading: boolean;
  activeAction: 'create' | 'update' | 'delete' | null;
  activeNoteId: number | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function NotesModal({
  isOpen,
  onClose,
  storeName,
  storeId,
  notes,
  onAddNote,
  onEditNote,
  onDeleteNote,
  isLoading,
  activeAction,
  activeNoteId,
}: NotesModalProps) {
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  if (!isOpen) return null;

  const handleAdd = async () => {
    if (!newText.trim()) return;
    await onAddNote(storeId, newText.trim());
    setNewText('');
  };

  const startEdit = (note: NoteType) => {
    setEditingId(note.id);
    setEditText(note.text);
  };

  const saveEdit = async () => {
    if (!editText.trim() || editingId === null) return;
    await onEditNote(storeId, editingId, editText.trim());
    setEditingId(null);
    setEditText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Notes — {storeName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 max-h-72 overflow-y-auto">
          {notes.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No notes yet.</p>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => {
                const isUpdating = isLoading && activeAction === 'update' && activeNoteId === note.id;
                const isDeleting = isLoading && activeAction === 'delete' && activeNoteId === note.id;

                if (editingId === note.id) {
                  return (
                    <div key={note.id} className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        disabled={isLoading}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setEditingId(null); setEditText(''); }}
                          disabled={isLoading}
                          className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => void saveEdit()}
                          disabled={isLoading}
                          className="px-3 py-1.5 text-xs bg-gray-800 text-white rounded-lg hover:bg-gray-700 cursor-pointer disabled:opacity-50"
                        >
                          {isUpdating ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={note.id} className="group rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.text}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {note.editedAt ? `Edited: ${formatDate(note.editedAt)}` : `Created: ${formatDate(note.createdAt)}`}
                      </span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(note)}
                          disabled={isLoading}
                          className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Delete this note?')) await onDeleteNote(storeId, note.id);
                          }}
                          disabled={isLoading}
                          className="text-xs text-red-500 hover:text-red-700 cursor-pointer disabled:opacity-50"
                        >
                          {isDeleting ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            disabled={isLoading}
            rows={3}
            placeholder="Add a note… (Ctrl+Enter to submit)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) void handleAdd(); }}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={() => void handleAdd()}
              disabled={isLoading || !newText.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isLoading && activeAction === 'create' ? 'Adding…' : 'Add Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
