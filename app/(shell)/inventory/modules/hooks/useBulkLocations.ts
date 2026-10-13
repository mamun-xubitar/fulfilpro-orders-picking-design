'use client';

import { useMemo, useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { bulkRemovedHolding, formatNumber } from '../utils';
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
  const [remap, setRemap] = useState<Record<string, string>>({});
  const { request, loading, errors, setErrors } = useRequest<ProductRecord>();
  const open = product !== null && openFor === product.id;

  const close = () => {
    setOpenFor(null);
    setErrors({});
    setRemap({});
  };

  // Removed locations holding stock across the selection (replace only) — each needs a
  // destination among the kept locations before Apply.
  const remapNeeds = useMemo(
    () => bulkRemovedHolding(product?.variants ?? [], selectedIds, locationIds, mode),
    [product, selectedIds, locationIds, mode]
  );
  const setRemapTarget = (fromId: string, toId: string) => setRemap((prev) => ({ ...prev, [fromId]: toId }));
  // A single destination is automatic — its value is used even before the select is touched.
  const resolvedRemap = useMemo(() => {
    if (remapNeeds.length === 0 || locationIds.length !== 1) return remap;
    return Object.fromEntries(remapNeeds.map((n) => [n.id, remap[n.id] ?? locationIds[0]]));
  }, [remap, remapNeeds, locationIds]);
  const remapComplete = remapNeeds.every((n) => resolvedRemap[n.id] && locationIds.includes(resolvedRemap[n.id]));

  const save = () => {
    if (!product) return;
    request({
      url: `/api/inventory/catalog/${product.id}/variants/locations`,
      method: 'POST',
      data: { variantIds: [...selectedIds], locationIds, mode, ...(remapNeeds.length > 0 ? { remap: resolvedRemap } : {}) },
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
    setMode: (next: 'add' | 'replace') => {
      setMode(next);
      setRemap({});
    },
    locationIds,
    setLocationIds: (ids: string[]) => {
      setLocationIds(ids);
      // Destinations changed — drop mappings that no longer point at a kept location.
      setRemap((prev) => Object.fromEntries(Object.entries(prev).filter(([, to]) => ids.includes(to))));
    },
    remapNeeds: remapNeeds.map((n) => ({ ...n, detail: `${formatNumber(n.totalQty)} across ${n.variantCount} variant${n.variantCount === 1 ? '' : 's'}` })),
    remap: resolvedRemap,
    setRemapTarget,
    remapComplete,
    errors,
    saving: loading,
    openModal: () => {
      if (!product) return;
      setMode('add');
      setLocationIds([]);
      setRemap({});
      setErrors({});
      setOpenFor(product.id);
    },
    close,
    save,
  };
}

export type BulkLocationsState = ReturnType<typeof useBulkLocations>;
