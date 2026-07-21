import { useState } from 'react';
import { toast } from 'react-toastify';
import type {
  AdminOption,
  ApiResponse,
  MessageModalState,
  OrderAdminMessage,
  OrderRow,
} from '../types';
import { getApiErrorMessage } from '../utils';

type UseOrderMessagesArgs = {
  setOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>;
  blockTestModeAction: () => boolean;
};

export function useOrderMessages({ setOrders, blockTestModeAction }: UseOrderMessagesArgs) {
  const [messageModal, setMessageModal] = useState<MessageModalState | null>(null);

  const openMessageModal = async (order: OrderRow) => {
    setMessageModal({
      order,
      admins: [],
      messages: [],
      selectedAdminId: '',
      message: '',
      loading: true,
      sending: false,
      error: '',
    });

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/messages`);
      const json = (await res.json()) as ApiResponse<{
        admins: AdminOption[];
        defaultAdminIds: string[];
        fulfillmentRequestAdmins: AdminOption[];
        fulfillmentRequestDefaultAdminIds: string[];
        messages: OrderAdminMessage[];
      }>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to load order messages'));
      }

      setMessageModal((prev) => {
        if (!prev || prev.order.id !== order.id) return prev;
        const allowedIds = new Set(json.data.admins.map((admin) => admin.id));
        const defaultId = json.data.defaultAdminIds.find((id) => allowedIds.has(id)) ?? json.data.admins[0]?.id ?? '';
        return {
          ...prev,
          admins: json.data.admins,
          messages: json.data.messages,
          selectedAdminId: defaultId,
          loading: false,
        };
      });
      setOrders((prev) => prev.map((item) => (
        item.id === order.id ? { ...item, messageCount: json.data.messages.length } : item
      )));
    } catch (err) {
      setMessageModal((prev) => (
        prev && prev.order.id === order.id
          ? { ...prev, loading: false, error: err instanceof Error ? err.message : 'Failed to load order messages.' }
          : prev
      ));
    }
  };

  const closeMessageModal = () => {
    if (messageModal?.sending) return;
    setMessageModal(null);
  };

  const submitAdminMessage = async () => {
    if (!messageModal || messageModal.sending) return;
    if (blockTestModeAction()) return;

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
        body: JSON.stringify({
          adminId: messageModal.selectedAdminId,
          message,
          type: 'orders',
        }),
      });
      const json = (await res.json()) as ApiResponse<OrderAdminMessage>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to send message'));
      }

      setOrders((prev) => prev.map((item) => (
        item.id === messageModal.order.id ? { ...item, messageCount: item.messageCount + 1 } : item
      )));
      setMessageModal(null);
      toast.success('Message sent to admin.');
    } catch (err) {
      setMessageModal((prev) => (
        prev ? { ...prev, sending: false, error: err instanceof Error ? err.message : 'Failed to send message.' } : prev
      ));
    }
  };

  return {
    messageModal,
    setMessageModal,
    openMessageModal,
    closeMessageModal,
    submitAdminMessage,
  };
}
