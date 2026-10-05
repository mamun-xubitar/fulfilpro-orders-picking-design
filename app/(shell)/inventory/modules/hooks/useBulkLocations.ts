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
  const { request, loading, errors } = useRequest<ProductRecord>();
  const open = product !== null && openFor === product.id;

  const save = () => {
    if (!product) return;
    request({
      url: `/api/inventory/catalog/${product.id}/variants/locations`,
      method: 'POST',
      data: { variantIds: [...selectedIds], locationIds, mode },
      successMessage: 'Locations updated',
      onSuccess: ({ data }) => {
        onSaved(data);
        setOpenFor(null);
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
      setOpenFor(product.id);
    },
    close: () => setOpenFor(null),
    save,
  };
}

export type BulkLocationsState = ReturnType<typeof useBulkLocations>;
