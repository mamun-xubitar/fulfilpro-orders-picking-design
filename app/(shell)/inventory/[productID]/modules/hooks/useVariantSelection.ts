'use client';

import { useCallback, useState } from 'react';
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

  const toggleVariant = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((variants: VariantDetail[]) => {
    setSelectedIds((prev) => {
      const allSelected = variants.length > 0 && variants.every((v) => prev.has(v.id));
      const next = new Set(prev);
      if (allSelected) {
        variants.forEach((v) => next.delete(v.id));
      } else {
        variants.forEach((v) => next.add(v.id));
      }
      return next;
    });
  }, []);

  const clearSelection = () => setSelectedIds(new Set());

  const retainOnly = useCallback((visibleIds: Set<string>) => {
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, []);

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
    retainOnly,
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
