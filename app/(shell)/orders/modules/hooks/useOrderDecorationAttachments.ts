import { useState } from 'react';
import { toast } from 'react-toastify';
import type {
  ApiResponse,
  DecorationFileRef,
  FileAttachmentField,
  OrderAttachmentField,
  OrderDecorationAttachments,
  OrderRow,
} from '../types';
import { getApiErrorMessage } from '../utils';

const FILE_FIELDS: FileAttachmentField[] = ['files', 'customerDesign', 'photos'];

type UseOrderDecorationAttachmentsArgs = {
  setOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>;
  blockTestModeAction: () => boolean;
};

export function useOrderDecorationAttachments({ setOrders, blockTestModeAction }: UseOrderDecorationAttachmentsArgs) {
  const [uploadingKeys, setUploadingKeys] = useState<Set<string>>(new Set());
  const [remarksDrafts, setRemarksDrafts] = useState<Record<string, string>>({});
  const [savingRemarksIds, setSavingRemarksIds] = useState<Set<string>>(new Set());

  const applyAttachments = (orderId: string, attachments: OrderDecorationAttachments) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, decorationAttachments: attachments } : o)));
  };

  const patchAttachments = async (orderId: string, patch: Partial<OrderDecorationAttachments>) => {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/decoration-attachments`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const json = (await res.json()) as ApiResponse<{ orderId: string; attachments: OrderDecorationAttachments }>;
    if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to update attachments'));
    return json.data.attachments;
  };

  const isUploading = (orderId: string, field: OrderAttachmentField) => uploadingKeys.has(`${orderId}:${field}`);

  const getUploadingFields = (orderId: string): Set<OrderAttachmentField> =>
    new Set(FILE_FIELDS.filter((field) => isUploading(orderId, field)));

  const isSavingRemarks = (orderId: string) => savingRemarksIds.has(orderId);

  const uploadAttachmentFiles = async (order: OrderRow, field: FileAttachmentField, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    if (blockTestModeAction()) return;
    const key = `${order.id}:${field}`;
    setUploadingKeys((prev) => new Set(prev).add(key));
    try {
      const fd = new FormData();
      Array.from(fileList).forEach((f) => fd.append('files', f));
      const res = await fetch('/api/decoration/uploads', { method: 'POST', body: fd });
      const json = (await res.json()) as ApiResponse<{ files: DecorationFileRef[] }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Upload failed'));
      const nextFiles = [...order.decorationAttachments[field], ...json.data.files];
      const attachments = await patchAttachments(order.id, { [field]: nextFiles });
      applyAttachments(order.id, attachments);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const removeAttachmentFile = async (order: OrderRow, field: FileAttachmentField, index: number) => {
    if (blockTestModeAction()) return;
    const nextFiles = order.decorationAttachments[field].filter((_, i) => i !== index);
    try {
      const attachments = await patchAttachments(order.id, { [field]: nextFiles });
      applyAttachments(order.id, attachments);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove file');
    }
  };

  const getRemarksValue = (order: OrderRow): string =>
    order.id in remarksDrafts ? remarksDrafts[order.id] : order.decorationAttachments.customerRemarks;

  const setRemarksDraft = (orderId: string, value: string) => {
    setRemarksDrafts((prev) => ({ ...prev, [orderId]: value }));
  };

  const commitRemarks = async (order: OrderRow) => {
    const draft = remarksDrafts[order.id];
    if (draft === undefined || draft === order.decorationAttachments.customerRemarks) return;
    if (blockTestModeAction()) return;
    setSavingRemarksIds((prev) => new Set(prev).add(order.id));
    try {
      const attachments = await patchAttachments(order.id, { customerRemarks: draft });
      applyAttachments(order.id, attachments);
      setRemarksDrafts((prev) => {
        const next = { ...prev };
        delete next[order.id];
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save remarks');
    } finally {
      setSavingRemarksIds((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  };

  return {
    getUploadingFields,
    isSavingRemarks,
    uploadAttachmentFiles,
    removeAttachmentFile,
    getRemarksValue,
    setRemarksDraft,
    commitRemarks,
  };
}
