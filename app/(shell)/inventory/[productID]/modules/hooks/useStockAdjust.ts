'use client';

import { useState } from 'react';
import useRequest from '@/hooks/useRequest';
import type { LocationOption } from '../types';

type UseStockAdjustArgs = {
  productId: string;
  locations: LocationOption[];
  bumpRefresh: () => void;
};

export function useStockAdjust({ productId, locations, bumpRefresh }: UseStockAdjustArgs) {
  const [deltas, setDeltas] = useState<Record<string, number>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [checkedLocationIds, setCheckedLocationIds] = useState<Set<string>>(new Set());
  const { request, loading: adjusting } = useRequest();

  const setDelta = (variantId: string, value: string) => {
    const parsed = value.trim() === '' ? 0 : Number(value);
    setDeltas((prev) => {
      const next = { ...prev };
      if (!value.trim() || Number.isNaN(parsed) || parsed === 0) delete next[variantId];
      else next[variantId] = parsed;
      return next;
    });
  };

  const hasPendingDeltas = Object.keys(deltas).length > 0;
  const totalDelta = Object.values(deltas).reduce((sum, d) => sum + d, 0);

  const openModal = () => {
    setCheckedLocationIds(new Set(locations.map((l) => l.id)));
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const toggleLocation = (id: string) => {
    setCheckedLocationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const apply = () => {
    const changes = Object.entries(deltas).map(([variantId, delta]) => ({ variantId, delta }));
    if (changes.length === 0 || checkedLocationIds.size === 0) return;

    request({
      url: `/api/inventory/products/${productId}/inventory`,
      method: 'POST',
      data: { locationIds: [...checkedLocationIds], changes } as unknown as Record<string, unknown>,
      successMessage: 'Inventory adjusted',
      onSuccess: () => {
        bumpRefresh();
        setDeltas({});
        setModalOpen(false);
      },
    });
  };

  return {
    deltas,
    setDelta,
    hasPendingDeltas,
    totalDelta,
    modalOpen,
    openModal,
    closeModal,
    checkedLocationIds,
    toggleLocation,
    adjusting,
    apply,
  };
}
