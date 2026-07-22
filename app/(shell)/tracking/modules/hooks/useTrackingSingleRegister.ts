'use client';

import { useCallback, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type { ApiResponse, CarrierOption, OrderSearchOption, SingleRegisterModalState } from '../types';

type UseTrackingSingleRegisterArgs = {
  bumpRefresh: () => void;
};

const EMPTY_MODAL: SingleRegisterModalState = {
  search: '',
  results: [],
  searching: false,
  dropdownOpen: false,
  selectedOrder: null,
  trackingNumber: '',
  suggesting: false,
  submitting: false,
  error: '',
  carrierCode: null,
  carrierName: '',
  carrierSearch: '',
  carrierResults: [],
  carrierSearching: false,
  carrierDropdownOpen: false,
  carrierAutoDetected: false,
};

export function useTrackingSingleRegister({ bumpRefresh }: UseTrackingSingleRegisterArgs) {
  const [singleModal, setSingleModal] = useState<SingleRegisterModalState | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const carrierSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openSingleModal = useCallback(() => {
    setSingleModal({ ...EMPTY_MODAL });
  }, []);

  const closeSingleModal = useCallback(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (carrierSearchDebounceRef.current) clearTimeout(carrierSearchDebounceRef.current);
    setSingleModal(null);
  }, []);

  const runSearch = useCallback(async (query: string) => {
    setSingleModal((prev) => (prev ? { ...prev, searching: true } : null));
    try {
      const params = new URLSearchParams({ search: query, pageSize: '10' });
      const res = await fetch(`/api/orders?${params.toString()}`);
      const json = (await res.json()) as ApiResponse<{ orders: OrderSearchOption[] }>;
      if (!res.ok || !json.success) throw new Error(json.message || 'Search failed');
      setSingleModal((prev) => (prev ? { ...prev, results: json.data.orders, searching: false } : null));
    } catch {
      setSingleModal((prev) => (prev ? { ...prev, results: [], searching: false } : null));
    }
  }, []);

  const focusSearch = useCallback(() => {
    setSingleModal((prev) => (prev ? { ...prev, dropdownOpen: true } : null));
    if (singleModal && !singleModal.search.trim() && singleModal.results.length === 0) {
      void runSearch('');
    }
  }, [singleModal, runSearch]);

  const blurSearch = useCallback(() => {
    setSingleModal((prev) => (prev ? { ...prev, dropdownOpen: false } : null));
  }, []);

  const setSearch = useCallback((value: string) => {
    setSingleModal((prev) => (prev ? { ...prev, search: value, dropdownOpen: true } : null));
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => { void runSearch(value.trim()); }, 300);
  }, [runSearch]);

  const selectOrder = useCallback(async (order: OrderSearchOption) => {
    setSingleModal((prev) => prev
      ? {
        ...prev,
        selectedOrder: order,
        dropdownOpen: false,
        search: '',
        results: [],
        trackingNumber: '',
        suggesting: true,
        error: '',
        carrierCode: null,
        carrierName: '',
        carrierAutoDetected: false,
      }
      : null);
    try {
      const res = await fetch(`/api/tracking/suggestion?orderId=${encodeURIComponent(order.id)}`);
      const json = (await res.json()) as ApiResponse<{
        trackingNumber: string | null;
        company: string | null;
        carrierCode: number | null;
        carrierName: string | null;
      }>;
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load suggestion');
      setSingleModal((prev) => (prev
        ? {
          ...prev,
          trackingNumber: json.data.trackingNumber ?? '',
          suggesting: false,
          carrierCode: json.data.carrierCode ?? null,
          carrierName: json.data.carrierName ?? '',
          carrierAutoDetected: json.data.carrierCode != null,
        }
        : null));
    } catch {
      setSingleModal((prev) => (prev ? { ...prev, suggesting: false } : null));
    }
  }, []);

  const setTrackingNumber = useCallback((value: string) => {
    setSingleModal((prev) => (prev ? { ...prev, trackingNumber: value } : null));
  }, []);

  const clearSelectedOrder = useCallback(() => {
    setSingleModal((prev) => (prev
      ? {
        ...prev,
        selectedOrder: null,
        search: '',
        results: [],
        trackingNumber: '',
        carrierCode: null,
        carrierName: '',
        carrierAutoDetected: false,
      }
      : null));
  }, []);

  const runCarrierSearch = useCallback(async (query: string) => {
    setSingleModal((prev) => (prev ? { ...prev, carrierSearching: true } : null));
    try {
      const params = new URLSearchParams({ search: query });
      const res = await fetch(`/api/tracking/carriers?${params.toString()}`);
      const json = (await res.json()) as ApiResponse<{ carriers: CarrierOption[] }>;
      if (!res.ok || !json.success) throw new Error(json.message || 'Search failed');
      setSingleModal((prev) => (prev ? { ...prev, carrierResults: json.data.carriers, carrierSearching: false } : null));
    } catch {
      setSingleModal((prev) => (prev ? { ...prev, carrierResults: [], carrierSearching: false } : null));
    }
  }, []);

  const focusCarrierSearch = useCallback(() => {
    setSingleModal((prev) => (prev ? { ...prev, carrierDropdownOpen: true } : null));
    if (singleModal && !singleModal.carrierSearch.trim() && singleModal.carrierResults.length === 0) {
      void runCarrierSearch('');
    }
  }, [singleModal, runCarrierSearch]);

  const blurCarrierSearch = useCallback(() => {
    setSingleModal((prev) => (prev ? { ...prev, carrierDropdownOpen: false } : null));
  }, []);

  const setCarrierSearch = useCallback((value: string) => {
    setSingleModal((prev) => (prev ? { ...prev, carrierSearch: value, carrierDropdownOpen: true } : null));
    if (carrierSearchDebounceRef.current) clearTimeout(carrierSearchDebounceRef.current);
    carrierSearchDebounceRef.current = setTimeout(() => { void runCarrierSearch(value.trim()); }, 300);
  }, [runCarrierSearch]);

  const selectCarrier = useCallback((carrier: CarrierOption) => {
    setSingleModal((prev) => (prev
      ? {
        ...prev,
        carrierCode: carrier.code,
        carrierName: carrier.name,
        carrierAutoDetected: false,
        carrierSearch: '',
        carrierResults: [],
        carrierDropdownOpen: false,
      }
      : null));
  }, []);

  const clearCarrier = useCallback(() => {
    setSingleModal((prev) => (prev
      ? { ...prev, carrierCode: null, carrierName: '', carrierAutoDetected: false, carrierSearch: '', carrierResults: [] }
      : null));
  }, []);

  const submitSingleRegister = useCallback(async () => {
    if (!singleModal?.selectedOrder || !singleModal.trackingNumber.trim()) return;
    setSingleModal((prev) => (prev ? { ...prev, submitting: true, error: '' } : null));

    try {
      const res = await fetch('/api/tracking/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: singleModal.selectedOrder.id,
          action: 'register-single',
          trackingNumber: singleModal.trackingNumber.trim(),
          carrier: singleModal.carrierCode,
        }),
      });
      const json = (await res.json()) as { success: boolean; message: string };
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to register tracking');
      toast.success(json.message || 'Tracking registered');
      closeSingleModal();
      bumpRefresh();
    } catch (err) {
      setSingleModal((prev) => (prev ? { ...prev, submitting: false, error: err instanceof Error ? err.message : 'Failed' } : null));
    }
  }, [singleModal, closeSingleModal, bumpRefresh]);

  return {
    singleModal,
    setSingleModal,
    openSingleModal,
    closeSingleModal,
    focusSearch,
    blurSearch,
    setSearch,
    selectOrder,
    setTrackingNumber,
    clearSelectedOrder,
    setCarrierSearch,
    selectCarrier,
    focusCarrierSearch,
    blurCarrierSearch,
    clearCarrier,
    submitSingleRegister,
  };
}
