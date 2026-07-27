'use client';

import { useState } from 'react';
import useRequest from '@/hooks/useRequest';
import type { VariantDetail } from '../types';

type UseVariantSelectionArgs = {
  productId: string;
  bumpRefresh: () => void;
};

export function useVariantSelection({ productId, bumpRefresh }: UseVariantSelectionArgs) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { request, loading: bulkSaving } = useRequest();

  const toggleVariant = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (variants: VariantDetail[]) => {
    setSelectedIds((prev) => {
      const allSelected = variants.length > 0 && variants.every((v) => prev.has(v.id));
      if (allSelected) return new Set();
      return new Set(variants.map((v) => v.id));
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const applyBulkVariantUpdate = (variants: Array<{ id: string; price?: number; inventoryPolicy?: 'DENY' | 'CONTINUE'; cost?: number | null }>) => {
    request({
      url: `/api/inventory/products/${productId}/variants`,
      method: 'PATCH',
      data: { variants } as unknown as Record<string, unknown>,
      successMessage: 'Variants updated',
      onSuccess: () => {
        bumpRefresh();
        clearSelection();
      },
    });
  };

  const setPriceForSelection = (price: number) => {
    applyBulkVariantUpdate([...selectedIds].map((id) => ({ id, price })));
  };

  const setCostForSelection = (cost: number) => {
    applyBulkVariantUpdate([...selectedIds].map((id) => ({ id, cost })));
  };

  const setContinueSellingForSelection = (inventoryPolicy: 'DENY' | 'CONTINUE') => {
    applyBulkVariantUpdate([...selectedIds].map((id) => ({ id, inventoryPolicy })));
  };

  const requestDelete = () => setDeleteConfirmOpen(true);
  const cancelDelete = () => setDeleteConfirmOpen(false);

  const confirmDelete = () => {
    request({
      url: `/api/inventory/products/${productId}/variants`,
      method: 'DELETE',
      data: { variantIds: [...selectedIds] } as unknown as Record<string, unknown>,
      successMessage: 'Variants deleted',
      onSuccess: () => {
        bumpRefresh();
        clearSelection();
        setDeleteConfirmOpen(false);
      },
    });
  };

  return {
    selectedIds,
    toggleVariant,
    toggleAll,
    clearSelection,
    bulkSaving,
    applyBulkVariantUpdate,
    setPriceForSelection,
    setCostForSelection,
    setContinueSellingForSelection,
    deleteConfirmOpen,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}
