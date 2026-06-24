import { useState } from 'react';
import { toast } from 'react-toastify';
import type { OrderRow, TrackingActionModalState, TrackingSummary } from '../types';

type SetOrders = React.Dispatch<React.SetStateAction<OrderRow[]>>;

export function useTracking({ orders, setOrders }: { orders: OrderRow[]; setOrders: SetOrders }) {
  const [trackingModal, setTrackingModal] = useState<TrackingActionModalState | null>(null);

  const openTrackingModal = (order: OrderRow) => {
    const hasTracking = order.trackings.length > 0;
    const firstTracking = order.trackings[0] ?? null;
    const regStatus = firstTracking?.registrationStatus;

    let action: TrackingActionModalState['action'] = 'register';
    if (regStatus === 'registered') action = 'pause';
    else if (regStatus === 'paused') action = 'restart';

    setTrackingModal({ order, tracking: firstTracking, action, saving: false, error: '' });
    void hasTracking;
  };

  const closeTrackingModal = () => setTrackingModal(null);

  const submitTrackingAction = async () => {
    if (!trackingModal) return;
    setTrackingModal((prev) => prev ? { ...prev, saving: true, error: '' } : null);

    const { order, tracking, action } = trackingModal;
    try {
      const res = await fetch('/api/tracking/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          action,
          trackingNumber: tracking?.trackingNumber,
        }),
      });
      const json = await res.json() as { success: boolean; message?: string; data?: { registered?: boolean } };

      if (!res.ok || !json.success) {
        throw new Error(json.message ?? 'Action failed');
      }

      toast.success(json.message ?? 'Done');

      const newStatus = action === 'register' ? 'registered' : action === 'pause' ? 'paused' : 'registered';
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== order.id) return o;
          if (action === 'register') {
            const trackingNumbers = getTrackingNumbers(o);
            const newTrackings: TrackingSummary[] = trackingNumbers.map((num) => ({
              id: '',
              trackingNumber: num,
              registrationStatus: 'registered',
              status: null,
            }));
            return { ...o, trackings: newTrackings };
          }
          return {
            ...o,
            trackings: o.trackings.map((t) =>
              t.trackingNumber === tracking?.trackingNumber ? { ...t, registrationStatus: newStatus } : t,
            ),
          };
        }),
      );

      closeTrackingModal();
    } catch (err) {
      setTrackingModal((prev) =>
        prev ? { ...prev, saving: false, error: err instanceof Error ? err.message : 'Failed' } : null,
      );
    }
  };

  return { trackingModal, openTrackingModal, closeTrackingModal, submitTrackingAction };
}

function getTrackingNumbers(order: OrderRow): string[] {
  const confirmations = order.fulfillmentItems?.confirmations ?? [];
  const numbers: string[] = [];
  for (const conf of confirmations) {
    const num = conf.trackingInfo?.number?.trim() ?? '';
    if (num) numbers.push(num);
  }
  return [...new Set(numbers)];
}
