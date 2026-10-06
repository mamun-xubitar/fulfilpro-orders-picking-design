'use client';

import { useState } from 'react';
import useRequest from '@/hooks/useRequest';
import type { ProductRecord } from '../types';

type Args = {
  product: ProductRecord | null;
  selectedIds: Set<string>;
  onSaved: (product: ProductRecord) => void;
  onDone: () => void;
};

/** "Set locations" for the variants selected in the Variants / stock table — add the chosen
 * locations to each, or replace each variant's set with them. */
export function useBulkLocations({ product, selectedIds, onSaved, onDone }: Args) {
  // Tagged with the product it was opened for, so stepping to another product closes it.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [mode, setMode] = useState<'add' | 'replace'>('add');
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const { request, loading, errors, setErrors } = useRequest<ProductRecord>();
  const open = product !== null && openFor === product.id;

  const close = () => {
    setOpenFor(null);
    setErrors({});
  };

  const save = () => {
    if (!product) return;
    request({
      url: `/api/inventory/catalog/${product.id}/variants/locations`,
      method: 'POST',
      data: { variantIds: [...selectedIds], locationIds, mode },
      successMessage: 'Locations updated',
      onSuccess: ({ data }) => {
        onSaved(data);
        close();
        onDone();
      },
    });
  };

  return {
    open,
    count: selectedIds.size,
    mode,
    setMode,
    locationIds,
    setLocationIds,
    errors,
    saving: loading,
    openModal: () => {
      if (!product) return;
      setMode('add');
      setLocationIds([]);
      setErrors({});
      setOpenFor(product.id);
    },
    close,
    save,
  };
}

export type BulkLocationsState = ReturnType<typeof useBulkLocations>;
