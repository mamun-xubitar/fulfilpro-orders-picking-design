import { useState } from 'react';
import { toast } from 'react-toastify';
import type {
  ApiResponse,
  DecorationFileRef,
  OrderItem,
  OrderRow,
  WorkDetailsModalState,
  WorkModalState,
} from '../types';
import { emptyCommentDraft, getApiErrorMessage } from '../utils';

type UseDecorationWorkArgs = {
  setOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>;
  blockTestModeAction: () => boolean;
  bumpRefresh: () => void;
};

export function useDecorationWork({ setOrders, blockTestModeAction, bumpRefresh }: UseDecorationWorkArgs) {
  const [workModal, setWorkModal] = useState<WorkModalState | null>(null);
  const [workDetails, setWorkDetails] = useState<WorkDetailsModalState | null>(null);
  const [requestingAccessKey, setRequestingAccessKey] = useState<string | null>(null);

  const applyItemDecoration = (orderId: string, lineItemId: string, flags: { isEmbroidery: boolean; isPrint: boolean }) => {
    setOrders((prev) => prev.map((o) => (
      o.id === orderId
        ? { ...o, items: o.items.map((it) => (it.id === lineItemId ? { ...it, ...flags } : it)) }
        : o
    )));
  };

  const toggleLineItemDecoration = async (order: OrderRow, item: OrderItem, field: 'isEmbroidery' | 'isPrint') => {
    if (blockTestModeAction()) return;
    const prevFlags = { isEmbroidery: item.isEmbroidery ?? false, isPrint: item.isPrint ?? false };
    const nextFlags = { ...prevFlags, [field]: !prevFlags[field] };
    applyItemDecoration(order.id, item.id, nextFlags);
    try {
      const res = await fetch(`/api/orders/${order.id}/line-items/${encodeURIComponent(item.id)}/decoration`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextFlags),
      });
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to update decoration'));
    } catch (err) {
      applyItemDecoration(order.id, item.id, prevFlags);
      toast.error(err instanceof Error ? err.message : 'Failed to update decoration');
    }
  };

  // ----- Decorator "done" workflow -----
  const openWorkModal = (order: OrderRow, item: OrderItem) => {
    if (blockTestModeAction()) return;
    const remaining = item.decoration?.remaining ?? item.qty;
    setWorkModal({ order, item, quantityDone: Math.max(1, Math.min(remaining, 1)), comments: [emptyCommentDraft()], saving: false, error: '' });
  };
  const closeWorkModal = () => setWorkModal(null);

  const updateWorkQuantity = (value: string) => {
    setWorkModal((prev) => {
      if (!prev) return prev;
      const remaining = prev.item.decoration?.remaining ?? prev.item.qty;
      const parsed = parseInt(value, 10);
      const clamped = Number.isNaN(parsed) || parsed < 1 ? 1 : Math.min(parsed, Math.max(1, remaining));
      return { ...prev, quantityDone: clamped };
    });
  };
  const addCommentRow = () => setWorkModal((prev) => (prev ? { ...prev, comments: [...prev.comments, emptyCommentDraft()] } : prev));
  const removeCommentRow = (index: number) => setWorkModal((prev) => (prev ? { ...prev, comments: prev.comments.filter((_, i) => i !== index) } : prev));
  const updateCommentField = (index: number, field: 'sizes' | 'colors' | 'remarks' | 'location', value: string) =>
    setWorkModal((prev) => (prev ? { ...prev, comments: prev.comments.map((c, i) => (i === index ? { ...c, [field]: value } : c)) } : prev));

  const uploadCommentFiles = async (index: number, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setWorkModal((prev) => (prev ? { ...prev, comments: prev.comments.map((c, i) => (i === index ? { ...c, uploading: true } : c)) } : prev));
    try {
      const fd = new FormData();
      Array.from(fileList).forEach((f) => fd.append('files', f));
      const res = await fetch('/api/decoration/uploads', { method: 'POST', body: fd });
      const json = (await res.json()) as ApiResponse<{ files: DecorationFileRef[] }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Upload failed'));
      setWorkModal((prev) => (prev ? { ...prev, comments: prev.comments.map((c, i) => (i === index ? { ...c, files: [...c.files, ...json.data.files], uploading: false } : c)) } : prev));
    } catch (err) {
      setWorkModal((prev) => (prev ? { ...prev, comments: prev.comments.map((c, i) => (i === index ? { ...c, uploading: false } : c)) } : prev));
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  };
  const removeCommentFile = (index: number, fileIndex: number) =>
    setWorkModal((prev) => (prev ? { ...prev, comments: prev.comments.map((c, i) => (i === index ? { ...c, files: c.files.filter((_, fi) => fi !== fileIndex) } : c)) } : prev));

  const submitWork = async () => {
    if (!workModal) return;
    const { order, item, quantityDone, comments } = workModal;
    setWorkModal((prev) => (prev ? { ...prev, saving: true, error: '' } : prev));
    const cleanedComments = comments
      .map(({ sizes, colors, remarks, location, files }) => ({
        sizes: sizes.trim() || undefined,
        colors: colors.trim() || undefined,
        remarks: remarks.trim() || undefined,
        location: location.trim() || undefined,
        files: files.length ? files : undefined,
      }))
      .filter((c) => c.sizes || c.colors || c.remarks || c.location || c.files);
    try {
      const res = await fetch(`/api/orders/${order.id}/line-items/${encodeURIComponent(item.id)}/work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantityDone, comments: cleanedComments }),
      });
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to mark as done'));
      toast.success('Marked as done.');
      setWorkModal(null);
      bumpRefresh();
    } catch (err) {
      setWorkModal((prev) => (prev ? { ...prev, saving: false, error: err instanceof Error ? err.message : 'Failed to mark as done' } : prev));
    }
  };

  const deleteWorkRecord = async (order: OrderRow, item: OrderItem, workId: string) => {
    if (blockTestModeAction()) return;
    try {
      const res = await fetch(`/api/orders/${order.id}/line-items/${encodeURIComponent(item.id)}/work/${workId}`, { method: 'DELETE' });
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to remove work'));
      toast.success('Work removed.');
      setWorkDetails(null);
      bumpRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove work');
    }
  };

  const requestEditAccess = async (order: OrderRow, item: OrderItem) => {
    if (blockTestModeAction()) return;
    const key = `${order.id}:${item.id}`;
    setRequestingAccessKey(key);
    try {
      const res = await fetch('/api/decoration/edit-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, lineItemId: item.id, reason: 'Requesting edit access' }),
      });
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to request access'));
      toast.success('Edit access requested. An admin will review it.');
      bumpRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to request access');
    } finally {
      setRequestingAccessKey(null);
    }
  };

  const openWorkDetails = (order: OrderRow, item: OrderItem) => setWorkDetails({ order, item });
  const closeWorkDetails = () => setWorkDetails(null);

  return {
    workModal, setWorkModal,
    workDetails, setWorkDetails,
    requestingAccessKey,
    toggleLineItemDecoration,
    openWorkModal,
    closeWorkModal,
    updateWorkQuantity,
    addCommentRow,
    removeCommentRow,
    updateCommentField,
    uploadCommentFiles,
    removeCommentFile,
    submitWork,
    deleteWorkRecord,
    requestEditAccess,
    openWorkDetails,
    closeWorkDetails,
  };
}
