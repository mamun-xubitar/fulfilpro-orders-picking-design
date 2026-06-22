import { useState } from 'react';
import { toast } from 'react-toastify';
import type { ApiResponse, NoteModalState, OrderNote, OrderRow } from '../types';
import { getApiErrorMessage } from '../utils';

type UseOrderNotesArgs = {
  setOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>;
  blockTestModeAction: () => boolean;
};

export function useOrderNotes({ setOrders, blockTestModeAction }: UseOrderNotesArgs) {
  const [noteModal, setNoteModal] = useState<NoteModalState | null>(null);

  const openNoteModal = async (order: OrderRow) => {
    setNoteModal({
      order,
      notes: [],
      note: '',
      editingNoteId: null,
      loading: true,
      saving: false,
      deletingId: null,
      error: '',
    });

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/notes`);
      const json = (await res.json()) as ApiResponse<OrderNote[]>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to load order notes'));
      }

      setNoteModal((prev) => {
        if (!prev || prev.order.id !== order.id) return prev;
        return {
          ...prev,
          notes: json.data,
          loading: false,
        };
      });
      setOrders((prev) => prev.map((item) => (
        item.id === order.id ? { ...item, noteCount: json.data.length } : item
      )));
    } catch (err) {
      setNoteModal((prev) => (
        prev && prev.order.id === order.id
          ? { ...prev, loading: false, error: err instanceof Error ? err.message : 'Failed to load order notes.' }
          : prev
      ));
    }
  };

  const closeNoteModal = () => {
    if (noteModal?.saving || noteModal?.deletingId) return;
    setNoteModal(null);
  };

  const startEditNote = (note: OrderNote) => {
    setNoteModal((prev) => prev ? { ...prev, note: note.note, editingNoteId: note.id, error: '' } : prev);
  };

  const cancelEditNote = () => {
    setNoteModal((prev) => prev ? { ...prev, note: '', editingNoteId: null, error: '' } : prev);
  };

  const submitOrderNote = async () => {
    if (!noteModal || noteModal.saving) return;
    if (blockTestModeAction()) return;

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
      const json = (await res.json()) as ApiResponse<OrderNote>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, editingNoteId ? 'Failed to update note' : 'Failed to add note'));
      }

      setNoteModal((prev) => {
        if (!prev || prev.order.id !== orderId) return prev;
        const notes = editingNoteId
          ? prev.notes.map((item) => item.id === editingNoteId ? json.data : item)
          : [json.data, ...prev.notes];
        return {
          ...prev,
          notes,
          note: '',
          editingNoteId: null,
          saving: false,
        };
      });
      setOrders((prev) => prev.map((item) => (
        item.id === orderId
          ? { ...item, noteCount: editingNoteId ? item.noteCount : item.noteCount + 1 }
          : item
      )));
      toast.success(editingNoteId ? 'Note updated.' : 'Note added.');
    } catch (err) {
      setNoteModal((prev) => (
        prev ? { ...prev, saving: false, error: err instanceof Error ? err.message : 'Failed to save note.' } : prev
      ));
    }
  };

  const deleteOrderNote = async (noteId: string) => {
    if (!noteModal || noteModal.deletingId) return;
    if (blockTestModeAction()) return;
    if (!window.confirm('Delete this note?')) return;

    const orderId = noteModal.order.id;
    setNoteModal((prev) => prev ? { ...prev, deletingId: noteId, error: '' } : prev);

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/notes/${encodeURIComponent(noteId)}`, {
        method: 'DELETE',
      });
      const json = (await res.json()) as ApiResponse<{ id: string }>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to delete note'));
      }

      setNoteModal((prev) => {
        if (!prev || prev.order.id !== orderId) return prev;
        const notes = prev.notes.filter((item) => item.id !== noteId);
        return {
          ...prev,
          notes,
          note: prev.editingNoteId === noteId ? '' : prev.note,
          editingNoteId: prev.editingNoteId === noteId ? null : prev.editingNoteId,
          deletingId: null,
        };
      });
      setOrders((prev) => prev.map((item) => (
        item.id === orderId ? { ...item, noteCount: Math.max(0, item.noteCount - 1) } : item
      )));
      toast.info('Note deleted.');
    } catch (err) {
      setNoteModal((prev) => (
        prev ? { ...prev, deletingId: null, error: err instanceof Error ? err.message : 'Failed to delete note.' } : prev
      ));
    }
  };

  return {
    noteModal,
    setNoteModal,
    openNoteModal,
    closeNoteModal,
    startEditNote,
    cancelEditNote,
    submitOrderNote,
    deleteOrderNote,
  };
}
