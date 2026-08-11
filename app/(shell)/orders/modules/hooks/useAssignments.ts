import { useState } from 'react';
import { toast } from 'react-toastify';
import type {
  ApiResponse,
  AssignModalState,
  DecoratorUser,
  LineItemAssignment,
  OrderItem,
  OrderRow,
} from '../types';
import { getApiErrorMessage } from '../utils';

type UseAssignmentsArgs = {
  setOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>;
  blockTestModeAction: () => boolean;
};

export function useAssignments({ setOrders, blockTestModeAction }: UseAssignmentsArgs) {
  const [assignModal, setAssignModal] = useState<AssignModalState | null>(null);
  const [decoratorUsers, setDecoratorUsers] = useState<DecoratorUser[]>([]);
  const [decoratorUsersLoaded, setDecoratorUsersLoaded] = useState(false);

  const applyItemAssignments = (orderId: string, lineItemId: string, assignments: LineItemAssignment[]) => {
    setOrders((prev) => prev.map((o) => (
      o.id === orderId
        ? { ...o, items: o.items.map((it) => (it.id === lineItemId ? { ...it, assignments } : it)) }
        : o
    )));
  };

  const ensureDecoratorUsers = async () => {
    if (decoratorUsersLoaded) return;
    try {
      const res = await fetch('/api/users/decorators');
      const json = (await res.json()) as ApiResponse<DecoratorUser[]>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to load decorators'));
      setDecoratorUsers(json.data);
      setDecoratorUsersLoaded(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load decorators');
    }
  };

  const openAssignModal = (order: OrderRow, item: OrderItem) => {
    if (blockTestModeAction()) return;
    setAssignModal({
      orderId: order.id,
      orderNumber: String(order.number),
      lineItemId: item.id,
      productName: item.name || item.title || item.sku || 'Item',
      assignments: item.assignments ?? [],
      selectedUserId: '',
      dueDate: '',
      saving: false,
      removingId: null,
      error: '',
    });
    void ensureDecoratorUsers();
  };

  const closeAssignModal = () => setAssignModal(null);

  const submitAssignment = async () => {
    if (!assignModal) return;
    if (!assignModal.selectedUserId) {
      setAssignModal((prev) => (prev ? { ...prev, error: 'Select a decorator to assign.' } : prev));
      return;
    }
    const { orderId, lineItemId, selectedUserId, dueDate } = assignModal;
    setAssignModal((prev) => (prev ? { ...prev, saving: true, error: '' } : prev));
    try {
      const res = await fetch(`/api/orders/${orderId}/line-items/${encodeURIComponent(lineItemId)}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId: selectedUserId, dueDate: dueDate || null }),
      });
      const json = (await res.json()) as ApiResponse<{ assignments: LineItemAssignment[] }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to add assignment'));
      applyItemAssignments(orderId, lineItemId, json.data.assignments);
      setAssignModal((prev) => (prev ? { ...prev, assignments: json.data.assignments, selectedUserId: '', dueDate: '', saving: false } : prev));
      toast.success('Assignment added.');
    } catch (err) {
      setAssignModal((prev) => (prev ? { ...prev, saving: false, error: err instanceof Error ? err.message : 'Failed to add assignment' } : prev));
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    if (!assignModal) return;
    const { orderId, lineItemId } = assignModal;
    setAssignModal((prev) => (prev ? { ...prev, removingId: assignmentId, error: '' } : prev));
    try {
      const res = await fetch(`/api/orders/${orderId}/line-items/${encodeURIComponent(lineItemId)}/assignments/${assignmentId}`, { method: 'DELETE' });
      const json = (await res.json()) as ApiResponse<{ assignments: LineItemAssignment[] }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to remove assignment'));
      applyItemAssignments(orderId, lineItemId, json.data.assignments);
      setAssignModal((prev) => (prev ? { ...prev, assignments: json.data.assignments, removingId: null } : prev));
    } catch (err) {
      setAssignModal((prev) => (prev ? { ...prev, removingId: null, error: err instanceof Error ? err.message : 'Failed to remove assignment' } : prev));
    }
  };

  return {
    assignModal,
    setAssignModal,
    openAssignModal,
    closeAssignModal,
    submitAssignment,
    removeAssignment,
    decoratorUsers,
    decoratorUsersLoaded,
  };
}
