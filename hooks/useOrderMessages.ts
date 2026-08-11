'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '@/lib/utils/api';

type ApiResponse<T> = { success: boolean; message: string; errors?: string[]; data: T };

export type MessageAdmin = { id: string; name: string; email: string };
export type MessageRecord = {
  id: string;
  adminName: string;
  adminEmail: string;
  senderName: string | null;
  senderEmail: string | null;
  message: string;
  createdAt: string;
};

export type OrderRef = { id: string; number: number; customer: string };

export type MessageModalState<O extends OrderRef = OrderRef> = {
  order: O;
  admins: MessageAdmin[];
  messages: MessageRecord[];
  selectedAdminId: string;
  message: string;
  loading: boolean;
  sending: boolean;
  error: string;
};

type Options<O extends OrderRef> = {
  messageType: 'orders' | 'picker';
  guard?: () => boolean;
  onCountChange?: (orderId: string, delta: number) => void;
};

export function useOrderMessages<O extends OrderRef>({ messageType, guard, onCountChange }: Options<O>) {
  const [messageModal, setMessageModal] = useState<MessageModalState<O> | null>(null);

  const openMessageModal = async (order: O) => {
    setMessageModal({ order, admins: [], messages: [], selectedAdminId: '', message: '', loading: true, sending: false, error: '' });
    try {
      const query = messageType === 'picker' ? '?type=picker' : '';
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/messages${query}`);
      const json = (await res.json()) as ApiResponse<{
        admins: MessageAdmin[];
        defaultAdminIds: string[];
        messages: MessageRecord[];
      }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to load order messages'));
      const allowedIds = new Set(json.data.admins.map((a) => a.id));
      const defaultId = json.data.defaultAdminIds.find((id) => allowedIds.has(id)) ?? json.data.admins[0]?.id ?? '';
      setMessageModal((prev) => {
        if (!prev || prev.order.id !== order.id) return prev;
        return { ...prev, admins: json.data.admins, messages: json.data.messages, selectedAdminId: defaultId, loading: false };
      });
      onCountChange?.(order.id, 0);
    } catch (err) {
      setMessageModal((prev) => prev && prev.order.id === order.id ? { ...prev, loading: false, error: err instanceof Error ? err.message : 'Failed to load order messages.' } : prev);
    }
  };

  const closeMessageModal = () => {
    if (messageModal?.sending) return;
    setMessageModal(null);
  };

  const submitMessage = async () => {
    if (!messageModal || messageModal.sending) return;
    if (guard?.()) return;
    const message = messageModal.message.trim();
    if (!messageModal.selectedAdminId || !message) {
      setMessageModal((prev) => prev ? { ...prev, error: 'Select a recipient and enter a message.' } : prev);
      return;
    }
    setMessageModal((prev) => prev ? { ...prev, sending: true, error: '' } : prev);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(messageModal.order.id)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: messageModal.selectedAdminId, message, type: messageType }),
      });
      const json = (await res.json()) as ApiResponse<MessageRecord>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to send message'));
      onCountChange?.(messageModal.order.id, 1);
      setMessageModal(null);
      toast.success('Message sent.');
    } catch (err) {
      setMessageModal((prev) => prev ? { ...prev, sending: false, error: err instanceof Error ? err.message : 'Failed to send message.' } : prev);
    }
  };

  return { messageModal, setMessageModal, openMessageModal, closeMessageModal, submitMessage };
}
