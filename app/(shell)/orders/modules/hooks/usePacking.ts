import { useState } from 'react';
import { toast } from 'react-toastify';
import type { ApiResponse, OrderItem, OrderRow, PackingLine } from '../types';
import { getApiErrorMessage, getFulfilledQty, rowItemKey } from '../utils';
import { getRemainingToPack } from '../slipDocument';

export type NotifyPackedState = {
  type: 'confirm' | 'cancel';
  order: OrderRow;
  lines?: PackingLine[];
  confirmationId?: string;
  selectedUserIds: string[];
  message: string;
  saving: boolean;
};

type UsePackingArgs = {
  setOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>;
  packingDefaultRecipientIds: string[];
  isLineFullChecked: (order: OrderRow, item: OrderItem, itemIndex: number) => boolean;
  partialValues: Record<string, number>;
  blockTestModeAction: () => boolean;
};

/** Confirm / cancel packed (Admin, Order Picker). The Full / Partial selection is shared with
 * fulfilment: each action clamps it to its own remaining quantity. */
export function usePacking({ setOrders, packingDefaultRecipientIds, isLineFullChecked, partialValues, blockTestModeAction }: UsePackingArgs) {
  const [notifyModal, setNotifyModal] = useState<NotifyPackedState | null>(null);

  const getPackingLines = (order: OrderRow): PackingLine[] => {
    const lines: PackingLine[] = [];
    order.items.forEach((item, index) => {
      if (getFulfilledQty(order, item.id) >= item.qty) return;
      const remaining = getRemainingToPack(item);
      const full = isLineFullChecked(order, item, index);
      const quantity = full ? remaining : Math.min(remaining, Math.max(0, partialValues[rowItemKey(order.id, index)] ?? 0));
      if (quantity > 0) lines.push({ lineItemId: item.id, quantity, full });
    });
    return lines;
  };

  const openConfirmPacked = (order: OrderRow) => {
    if (blockTestModeAction()) return;
    const lines = getPackingLines(order);
    if (lines.length === 0) {
      toast.error('Select Full or enter a partial quantity before confirming packed.');
      return;
    }
    setNotifyModal({ type: 'confirm', order, lines, selectedUserIds: packingDefaultRecipientIds, message: '', saving: false });
  };

  const openCancelPacked = (order: OrderRow, confirmationId?: string) => {
    if (blockTestModeAction()) return;
    const confirmations = order.packingConfirmations ?? [];
    const active = confirmationId
      ? confirmations.find((c) => c.id === confirmationId && !c.canceledAt)
      : confirmations.find((c) => !c.canceledAt);
    if (!active) {
      toast.error('This order has no active packed confirmation to cancel.');
      return;
    }
    setNotifyModal({ type: 'cancel', order, confirmationId: active.id, selectedUserIds: packingDefaultRecipientIds, message: '', saving: false });
  };

  const submitNotifyAction = async () => {
    if (!notifyModal || notifyModal.saving) return;
    setNotifyModal((prev) => (prev ? { ...prev, saving: true } : prev));
    try {
      const isConfirm = notifyModal.type === 'confirm';
      const res = await fetch(
        isConfirm
          ? `/api/orders/${notifyModal.order.id}/packing-confirmations`
          : `/api/orders/${notifyModal.order.id}/packing-confirmations/${notifyModal.confirmationId}`,
        {
          method: isConfirm ? 'POST' : 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lines: notifyModal.lines ?? [], notifyUserIds: notifyModal.selectedUserIds, notifyMessage: notifyModal.message }),
        },
      );
      const json = (await res.json()) as ApiResponse<{ order: OrderRow }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Packing update failed'));
      setOrders((prev) => prev.map((o) => (o.id === json.data.order.id ? json.data.order : o)));
      setNotifyModal(null);
      toast.success(isConfirm ? 'Packed quantities confirmed' : 'Packed confirmation canceled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Packing update failed');
      setNotifyModal((prev) => (prev ? { ...prev, saving: false } : prev));
    }
  };

  return { notifyModal, setNotifyModal, getPackingLines, openConfirmPacked, openCancelPacked, submitNotifyAction };
}
