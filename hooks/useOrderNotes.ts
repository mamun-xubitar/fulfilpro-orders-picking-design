'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '@/lib/utils/api';

type ApiResponse<T> = { success: boolean; message: string; errors?: string[]; data: T };

export type NoteRecord = {
  id: string;
  note: string;
  authorName: string | null;
  authorEmail: string | null;
  editorName?: string | null;
  editorEmail?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderRef = { id: string; number: number; customer: string };

export type NoteModalState<O extends OrderRef = OrderRef> = {
  order: O;
  notes: NoteRecord[];
  note: string;
  editingNoteId: string | null;
  loading: boolean;
  saving: boolean;
  deletingId: string | null;
  error: string;
};

type Options<O extends OrderRef> = {
  guard?: () => boolean;
  onCountChange?: (orderId: string, count: number, delta: number) => void;
};

export function useOrderNotes<O extends OrderRef>({ guard, onCountChange }: Options<O> = {}) {
  const [noteModal, setNoteModal] = useState<NoteModalState<O> | null>(null);

  const openNoteModal = async (order: O) => {
    setNoteModal({ order, notes: [], note: '', editingNoteId: null, loading: true, saving: false, deletingId: null, error: '' });
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/notes`);
      const json = (await res.json()) as ApiResponse<NoteRecord[]>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to load order notes'));
      setNoteModal((prev) => prev && prev.order.id === order.id ? { ...prev, notes: json.data, loading: false } : prev);
      onCountChange?.(order.id, json.data.length, 0);
    } catch (err) {
      setNoteModal((prev) => prev && prev.order.id === order.id ? { ...prev, loading: false, error: err instanceof Error ? err.message : 'Failed to load order notes.' } : prev);
    }
  };

  const closeNoteModal = () => {
    if (noteModal?.saving || noteModal?.deletingId) return;
    setNoteModal(null);
  };

  const startEditNote = (note: NoteRecord) => {
    setNoteModal((prev) => prev ? { ...prev, note: note.note, editingNoteId: note.id, error: '' } : prev);
  };

  const cancelEditNote = () => {
    setNoteModal((prev) => prev ? { ...prev, note: '', editingNoteId: null, error: '' } : prev);
  };

  const submitNote = async () => {
    if (!noteModal || noteModal.saving) return;
    if (guard?.()) return;
    const note = noteModal.note.trim();
    if (!note) {
      setNoteModal((prev) => prev ? { ...prev, error: 'Note is required.' } : prev);
      return;
    }
    const editingNoteId = noteModal.editingNoteId;
    const orderId = noteModal.order.id;
    setNoteModal((prev) => prev ? { ...prev, saving: true, error: '' } : prev);
    try {
      const res = await fetch(
        editingNoteId
          ? `/api/orders/${encodeURIComponent(orderId)}/notes/${encodeURIComponent(editingNoteId)}`
          : `/api/orders/${encodeURIComponent(orderId)}/notes`,
        {
          method: editingNoteId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note }),
        }
      );
      const json = (await res.json()) as ApiResponse<NoteRecord>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, editingNoteId ? 'Failed to update note' : 'Failed to add note'));
      setNoteModal((prev) => {
        if (!prev || prev.order.id !== orderId) return prev;
        const notes = editingNoteId
          ? prev.notes.map((item) => item.id === editingNoteId ? json.data : item)
          : [json.data, ...prev.notes];
        return { ...prev, notes, note: '', editingNoteId: null, saving: false };
      });
      if (!editingNoteId) onCountChange?.(orderId, 0, 1);
      toast.success(editingNoteId ? 'Note updated.' : 'Note added.');
    } catch (err) {
      setNoteModal((prev) => prev ? { ...prev, saving: false, error: err instanceof Error ? err.message : 'Failed to save note.' } : prev);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!noteModal || noteModal.deletingId) return;
    if (guard?.()) return;
    if (!window.confirm('Delete this note?')) return;
    const orderId = noteModal.order.id;
    setNoteModal((prev) => prev ? { ...prev, deletingId: noteId, error: '' } : prev);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/notes/${encodeURIComponent(noteId)}`, { method: 'DELETE' });
      const json = (await res.json()) as ApiResponse<{ id: string }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to delete note'));
      setNoteModal((prev) => {
        if (!prev || prev.order.id !== orderId) return prev;
        return {
          ...prev,
          notes: prev.notes.filter((item) => item.id !== noteId),
          note: prev.editingNoteId === noteId ? '' : prev.note,
          editingNoteId: prev.editingNoteId === noteId ? null : prev.editingNoteId,
          deletingId: null,
        };
      });
      onCountChange?.(orderId, 0, -1);
      toast.info('Note deleted.');
    } catch (err) {
      setNoteModal((prev) => prev ? { ...prev, deletingId: null, error: err instanceof Error ? err.message : 'Failed to delete note.' } : prev);
    }
  };

  return { noteModal, setNoteModal, openNoteModal, closeNoteModal, startEditNote, cancelEditNote, submitNote, deleteNote };
}
