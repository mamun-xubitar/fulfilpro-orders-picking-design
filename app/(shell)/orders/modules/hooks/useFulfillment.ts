import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type {
  ApiResponse,
  FulfillmentLine,
  OrderItem,
  OrderRow,
  PendingFulfillmentModalState,
} from '../types';
import { SHOPIFY_TRACKING_CARRIERS } from '../constants';
import {
  getApiErrorMessage,
  getFulfilledQty,
  isLineFullyFulfilled,
  isOrderFulfillmentLocked,
  parseBarcodes,
  rowItemKey,
} from '../utils';

type UseFulfillmentArgs = {
  orders: OrderRow[];
  setOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>;
  blockTestModeAction: () => boolean;
};

export function useFulfillment({ setOrders, blockTestModeAction }: UseFulfillmentArgs) {
  const [fullChecks, setFullChecks] = useState<Record<string, boolean>>({});
  const [partialValues, setPartialValues] = useState<Record<string, number>>({});
  const [fulMessages, setFulMessages] = useState<Record<string, string>>({});
  const [fulSaving, setFulSaving] = useState<Record<string, boolean>>({});
  const [carrierDropdownOpen, setCarrierDropdownOpen] = useState(false);
  const [carrierSearch, setCarrierSearch] = useState('');
  const [pendingFulfillment, setPendingFulfillment] = useState<PendingFulfillmentModalState | null>(null);
  const messageTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const fullSelectBtnRef = useRef<HTMLButtonElement>(null);
  const trackingNumInputRef = useRef<HTMLInputElement>(null);

  const filteredTrackingCarriers = useMemo(() => {
    const query = carrierSearch.trim();
    if (!query) return SHOPIFY_TRACKING_CARRIERS;

    const matchingCarriers = SHOPIFY_TRACKING_CARRIERS.filter((carrier) => (
      carrier.toLowerCase().includes(query.toLowerCase())
    ));
    const hasExactMatch = matchingCarriers.some((carrier) => carrier.toLowerCase() === query.toLowerCase());

    return hasExactMatch ? matchingCarriers : [query, ...matchingCarriers];
  }, [carrierSearch]);

  const isLineFullChecked = (order: OrderRow, item: OrderItem, itemIndex: number) => {
    return isLineFullyFulfilled(order, item) || (fullChecks[rowItemKey(order.id, itemIndex)] ?? false);
  };

  const toggleFull = (orderId: string, itemIndex: number, remainingQty: number) => {
    const key = rowItemKey(orderId, itemIndex);
    const nextChecked = !(fullChecks[key] ?? false);
    setFullChecks((prev) => ({ ...prev, [key]: nextChecked }));
    setPartialValues((prev) => ({ ...prev, [key]: nextChecked ? remainingQty : 0 }));
  };

  const toggleAllFull = (order: OrderRow) => {
    const allChecked = order.items.every((item, itemIndex) => isLineFullChecked(order, item, itemIndex));
    const nextValue = !allChecked;

    setFullChecks((prev) => {
      const updated = { ...prev };
      order.items.forEach((item, itemIndex) => {
        if (!isLineFullyFulfilled(order, item)) {
          updated[rowItemKey(order.id, itemIndex)] = nextValue;
        }
      });
      return updated;
    });

    setPartialValues((prev) => {
      const updated = { ...prev };
      order.items.forEach((item, itemIndex) => {
        const fulfilledQty = getFulfilledQty(order, item.id);
        const remainingQty = Math.max(0, item.qty - fulfilledQty);
        updated[rowItemKey(order.id, itemIndex)] = nextValue ? remainingQty : 0;
      });
      return updated;
    });

    if (!allChecked) {
      setTimeout(() => {
        fullSelectBtnRef.current?.click()
      }, 100);
    }
  };

  const validPartial = (orderId: string, itemIndex: number, maxQty: number, value: string) => {
    const parsed = parseInt(value, 10);
    const clamped = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed > maxQty ? maxQty : parsed;
    setPartialValues((prev) => ({ ...prev, [rowItemKey(orderId, itemIndex)]: clamped }));
  };

  const getFulfillmentLines = (order: OrderRow) => {
    return order.items
      .map((item, itemIndex) => {
        const key = rowItemKey(order.id, itemIndex);
        const fulfilledQty = getFulfilledQty(order, item.id);
        const remainingQty = Math.max(0, item.qty - fulfilledQty);
        const isFull = isLineFullChecked(order, item, itemIndex);
        const requestedQty = Math.min(remainingQty, Math.max(0, partialValues[key] ?? 0));
        const quantity = isFull ? remainingQty : requestedQty;

        if (quantity < 1) return null;

        return {
          lineItemId: item.id,
          quantity,
          full: isFull,
        };
      })
      .filter((line): line is FulfillmentLine => Boolean(line));
  };

  const setFulfillmentMessage = (orderId: string, message: string) => {
    setFulMessages((prev) => ({ ...prev, [orderId]: message }));
    if (messageTimerRef.current[orderId]) {
      clearTimeout(messageTimerRef.current[orderId]);
    }
    messageTimerRef.current[orderId] = setTimeout(() => {
      setFulMessages((prev) => ({ ...prev, [orderId]: '' }));
    }, 3000);
  };

  const openFulfillmentConfirmation = (order: OrderRow) => {
    if (blockTestModeAction()) return;

    if (isOrderFulfillmentLocked(order)) {
      toast.error(`${order.status === 'closed' ? 'Closed' : 'Canceled'} orders cannot be fulfilled.`);
      return;
    }

    const lines = getFulfillmentLines(order);

    if (lines.length === 0) {
      toast.error('Increase a quantity or check Full for an item with remaining stock.');
      return;
    }

    setPendingFulfillment({
      order,
      lines,
      notifyCustomer: true,
      barcodeInput: '',
      trackingNumber: '',
      trackingUrl: '',
      trackingCompany: 'Australia Post',
    });
    setCarrierDropdownOpen(false);
    setCarrierSearch('');
    setTimeout(() => {
      trackingNumInputRef.current?.focus();
    }, 100);
  };

  const closeFulfillmentConfirmation = () => {
    if (!pendingFulfillment || fulSaving[pendingFulfillment.order.id]) return;
    setPendingFulfillment(null);
    setCarrierDropdownOpen(false);
    setCarrierSearch('');
  };

  const confirmFul = async () => {
    if (!pendingFulfillment) return;
    if (blockTestModeAction()) return;

    const { order, lines, notifyCustomer, barcodeInput, trackingNumber, trackingUrl, trackingCompany } = pendingFulfillment;
    const barcodes = parseBarcodes(barcodeInput);
    const trimmedTrackingNumber = trackingNumber.trim();
    const trimmedTrackingCompany = trackingCompany.trim();

    if (trimmedTrackingCompany && !trimmedTrackingNumber) {
      toast.error('Tracking number is required when a shipping carrier is selected.');
      return;
    }

    const trackingInfo = {
      number: trimmedTrackingNumber,
      url: trackingUrl.trim(),
      company: trimmedTrackingCompany,
    };
    setFulSaving((prev) => ({ ...prev, [order.id]: true }));
    try {
      const res = await fetch(`/api/orders/${order.id}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines,
          notifyCustomer,
          trackingInfo,
          barcodes,
        }),
      });
      const json = (await res.json()) as ApiResponse<{
        orderId: string;
        status: string;
        fulfillmentItems: OrderRow['fulfillmentItems'];
        stockAdjustment: OrderRow['stockAdjustment'];
      }>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to confirm fulfillment'));
      }

      setOrders((prev) => prev.map((item) => (
        item.id === order.id
          ? { ...item, status: json.data.status, fulfillmentItems: json.data.fulfillmentItems, stockAdjustment: json.data.stockAdjustment }
          : item
      )));
      setFulfillmentMessage(order.id, 'Fulfilment confirmed!');
      setPendingFulfillment(null);
      setCarrierDropdownOpen(false);
      setCarrierSearch('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm fulfillment.');
    } finally {
      setFulSaving((prev) => ({ ...prev, [order.id]: false }));
    }
  };

  useEffect(() => {
    const timers = messageTimerRef.current;
    return () => {
      Object.values(timers).forEach((timerId) => clearTimeout(timerId));
    };
  }, []);

  const resetOrderSelections = (orderId: string) => {
    const prefix = `${orderId}-`;
    const isOrderRowKey = (key: string) => key.startsWith(prefix) && /^\d+$/.test(key.slice(prefix.length));

    setFullChecks((prev) => {
      const updated = { ...prev };
      for (const key of Object.keys(updated)) {
        if (isOrderRowKey(key)) delete updated[key];
      }
      return updated;
    });
    setPartialValues((prev) => {
      const updated = { ...prev };
      for (const key of Object.keys(updated)) {
        if (isOrderRowKey(key)) delete updated[key];
      }
      return updated;
    });
  };

  return {
    fullChecks,
    partialValues,
    resetOrderSelections,
    fulMessages,
    fulSaving,
    carrierDropdownOpen, setCarrierDropdownOpen,
    carrierSearch, setCarrierSearch,
    pendingFulfillment, setPendingFulfillment,
    trackingNumInputRef,
    fullSelectBtnRef,
    filteredTrackingCarriers,
    isLineFullChecked,
    toggleFull,
    toggleAllFull,
    validPartial,
    getFulfillmentLines,
    setFulfillmentMessage,
    openFulfillmentConfirmation,
    closeFulfillmentConfirmation,
    confirmFul,
  };
}
