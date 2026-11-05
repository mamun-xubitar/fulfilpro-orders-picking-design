import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import type {
  AdminOption,
  ApiResponse,
  CancelFulfillmentModalState,
  EditFulfillmentModalState,
  FulfillmentConfirmation,
  FulfillmentEditRequestRow,
  OrderRow,
  RequestPermissionModalState,
} from '../types';
import { getActiveFulfillmentRequest as getActiveFulfillmentRequestPure, getApiErrorMessage } from '../utils';

type UseFulfillmentRequestsArgs = {
  setOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>;
  blockTestModeAction: () => boolean;
  userIsAdmin: boolean;
};

export function useFulfillmentRequests({ setOrders, blockTestModeAction, userIsAdmin }: UseFulfillmentRequestsArgs) {
  const [orderFulfillmentRequests, setOrderFulfillmentRequests] = useState<Record<string, FulfillmentEditRequestRow[]>>({});
  const [pendingRequests, setPendingRequests] = useState<FulfillmentEditRequestRow[]>([]);
  const [pendingRequestsPanelOpen, setPendingRequestsPanelOpen] = useState(false);
  const [fulfillmentViewOrderId, setFulfillmentViewOrderId] = useState<string | null>(null);
  const [editFulModal, setEditFulModal] = useState<EditFulfillmentModalState | null>(null);
  const [cancelFulModal, setCancelFulModal] = useState<CancelFulfillmentModalState | null>(null);
  const [requestPermModal, setRequestPermModal] = useState<RequestPermissionModalState | null>(null);

  const loadFulfillmentRequests = useCallback(async (orderId: string) => {
    try {
      const res = await fetch(`/api/fulfillment-requests?orderId=${encodeURIComponent(orderId)}`);
      const json = (await res.json()) as ApiResponse<FulfillmentEditRequestRow[]>;
      if (res.ok && json.success) {
        setOrderFulfillmentRequests((prev) => ({ ...prev, [orderId]: json.data }));
      }
    } catch { /* silent */ }
  }, []);

  const loadPendingRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/fulfillment-requests?pending=true');
      const json = (await res.json()) as ApiResponse<FulfillmentEditRequestRow[]>;
      if (res.ok && json.success) {
        setPendingRequests(json.data);
      }
    } catch { /* silent */ }
  }, []);

  const getActiveFulfillmentRequest = (orderId: string, fulfillmentId: string | undefined, requestType: 'edit' | 'cancel') =>
    getActiveFulfillmentRequestPure(orderFulfillmentRequests[orderId] ?? [], orderId, fulfillmentId, requestType);

  const openEditFulModal = (order: OrderRow, conf: FulfillmentConfirmation, confId: string) => {
    if (blockTestModeAction()) return;

    setEditFulModal({
      order, conf, confId,
      barcodes: conf.barcodes?.join(' ') ?? '',
      fulfillmentDate: conf.fulfillmentDate ?? '',
      carrier: conf.trackingInfo?.company ?? '',
      trackingNumber: conf.trackingInfo?.number ?? '',
      trackingUrl: conf.trackingInfo?.url ?? '',
      saving: false, error: '',
    });
  };

  const submitEditFulfillment = async () => {
    if (!editFulModal) return;
    if (blockTestModeAction()) return;
    const { order, confId, barcodes, fulfillmentDate, carrier, trackingNumber, trackingUrl } = editFulModal;
    setEditFulModal((prev) => prev ? { ...prev, saving: true, error: '' } : null);
    try {
      const res = await fetch(`/api/orders/${order.id}/fulfillments/${encodeURIComponent(confId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcodes: barcodes.split(/\s+/).filter(Boolean),
          fulfillmentDate: fulfillmentDate || null,
          trackingInfo: { number: trackingNumber.trim(), url: trackingUrl.trim(), company: carrier.trim() },
        }),
      });
      const json = (await res.json()) as ApiResponse<{ orderId: string; fulfillmentItems: OrderRow['fulfillmentItems'] }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to update fulfillment'));
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, fulfillmentItems: json.data.fulfillmentItems } : o));
      setOrderFulfillmentRequests((prev) => {
        const updated = (prev[order.id] ?? []).map((r) =>
          r.fulfillmentId === confId && r.requestType === 'edit' && r.status === 'approved'
            ? { ...r, status: 'completed' as const } : r
        );
        return { ...prev, [order.id]: updated };
      });
      toast.success('Fulfillment updated.');
      setEditFulModal(null);
    } catch (err) {
      setEditFulModal((prev) => prev ? { ...prev, saving: false, error: err instanceof Error ? err.message : 'Failed to update' } : null);
    }
  };

  const openCancelFulModal = (order: OrderRow, conf: FulfillmentConfirmation, confId: string) => {
    if (blockTestModeAction()) return;

    setCancelFulModal({ order, conf, confId, saving: false, error: '' });
  };

  const submitCancelFulfillment = async () => {
    if (!cancelFulModal) return;
    if (blockTestModeAction()) return;
    const { order, confId } = cancelFulModal;
    setCancelFulModal((prev) => prev ? { ...prev, saving: true, error: '' } : null);
    try {
      const res = await fetch(`/api/orders/${order.id}/fulfillments/${encodeURIComponent(confId)}`, { method: 'DELETE' });
      const json = (await res.json()) as ApiResponse<{ orderId: string; status: string; fulfillmentItems: OrderRow['fulfillmentItems']; stockAdjustment: OrderRow['stockAdjustment'] }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to cancel fulfillment'));
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: json.data.status, fulfillmentItems: json.data.fulfillmentItems, stockAdjustment: json.data.stockAdjustment } : o));
      setOrderFulfillmentRequests((prev) => {
        const updated = (prev[order.id] ?? []).map((r) =>
          r.fulfillmentId === confId && r.requestType === 'cancel' && r.status === 'approved'
            ? { ...r, status: 'completed' as const } : r
        );
        return { ...prev, [order.id]: updated };
      });
      toast.success('Fulfillment cancelled.');
      setCancelFulModal(null);
      if (json.data.fulfillmentItems.confirmations.length === 0) setFulfillmentViewOrderId(null);
    } catch (err) {
      setCancelFulModal((prev) => prev ? { ...prev, saving: false, error: err instanceof Error ? err.message : 'Failed to cancel' } : null);
    }
  };

  const openRequestPermModal = async (order: OrderRow, conf: FulfillmentConfirmation, confId: string, requestType: 'edit' | 'cancel') => {
    if (blockTestModeAction()) return;

    setRequestPermModal({ order, conf, confId, requestType, availableAdmins: [], selectedAdminIds: [], reason: '', loadingAdmins: true, saving: false, error: '' });
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/messages?type=orders`);
      const json = (await res.json()) as ApiResponse<{
        admins: AdminOption[];
        defaultAdminIds: string[];
        fulfillmentRequestAdmins: AdminOption[];
        fulfillmentRequestDefaultAdminIds: string[];
        messages: unknown[];
      }>;
      if (res.ok && json.success) {
        const allowedIds = new Set(json.data.fulfillmentRequestAdmins.map((admin) => admin.id));
        const defaultSelection = json.data.fulfillmentRequestDefaultAdminIds.filter((id) => allowedIds.has(id));
        setRequestPermModal((prev) => prev ? {
          ...prev,
          availableAdmins: json.data.fulfillmentRequestAdmins,
          selectedAdminIds: defaultSelection,
          loadingAdmins: false,
        } : null);
      } else {
        setRequestPermModal((prev) => prev ? { ...prev, loadingAdmins: false, error: 'Failed to load admin list' } : null);
      }
    } catch {
      setRequestPermModal((prev) => prev ? { ...prev, loadingAdmins: false, error: 'Failed to load admin list' } : null);
    }
  };

  const submitPermissionRequest = async () => {
    if (!requestPermModal) return;
    if (blockTestModeAction()) return;
    const { order, confId, requestType, selectedAdminIds, reason } = requestPermModal;
    if (!reason.trim()) { setRequestPermModal((prev) => prev ? { ...prev, error: 'Reason is required' } : null); return; }
    if (selectedAdminIds.length === 0) { setRequestPermModal((prev) => prev ? { ...prev, error: 'Select at least one admin' } : null); return; }
    setRequestPermModal((prev) => prev ? { ...prev, saving: true, error: '' } : null);
    try {
      const res = await fetch('/api/fulfillment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, orderNumber: order.number, fulfillmentId: confId, requestType, adminIds: selectedAdminIds, reason: reason.trim() }),
      });
      const json = (await res.json()) as ApiResponse<FulfillmentEditRequestRow>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to submit request'));
      setOrderFulfillmentRequests((prev) => ({ ...prev, [order.id]: [...(prev[order.id] ?? []), json.data] }));
      toast.success('Permission request submitted. Admin has been notified.');
      setRequestPermModal(null);
    } catch (err) {
      setRequestPermModal((prev) => prev ? { ...prev, saving: false, error: err instanceof Error ? err.message : 'Failed to submit' } : null);
    }
  };

  const handleAdminApproveRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/fulfillment-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const json = (await res.json()) as ApiResponse<FulfillmentEditRequestRow>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to approve'));
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.success('Request approved. Staff can now perform the action.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve request');
    }
  };

  const handleAdminRejectRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/fulfillment-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });
      const json = (await res.json()) as ApiResponse<FulfillmentEditRequestRow>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to reject'));
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.info('Request rejected.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject request');
    }
  };

  useEffect(() => {
    if (userIsAdmin) void loadPendingRequests();
  }, [userIsAdmin, loadPendingRequests]);

  useEffect(() => {
    if (!fulfillmentViewOrderId) return;
    void loadFulfillmentRequests(fulfillmentViewOrderId);
  }, [fulfillmentViewOrderId, loadFulfillmentRequests]);

  return {
    orderFulfillmentRequests, setOrderFulfillmentRequests,
    pendingRequests, pendingRequestsPanelOpen, setPendingRequestsPanelOpen,
    fulfillmentViewOrderId, setFulfillmentViewOrderId,
    editFulModal, setEditFulModal,
    cancelFulModal, setCancelFulModal,
    requestPermModal, setRequestPermModal,
    loadFulfillmentRequests,
    loadPendingRequests,
    getActiveFulfillmentRequest,
    openEditFulModal,
    submitEditFulfillment,
    openCancelFulModal,
    submitCancelFulfillment,
    openRequestPermModal,
    submitPermissionRequest,
    handleAdminApproveRequest,
    handleAdminRejectRequest,
  };
}
