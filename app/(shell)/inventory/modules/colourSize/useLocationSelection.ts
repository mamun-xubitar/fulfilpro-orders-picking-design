'use client';

import { useMemo, useState } from 'react';
import type { LocationOption } from '../hooks/useLocations';
import type { ProductRecord } from '../types';
import { bulkRemovedHolding, formatNumber } from '../utils';

type UseLocationSelectionArgs = {
  product: ProductRecord;
  locationOptions: LocationOption[];
  /** Ids of the product's existing variants that stay after Update — the ones whose unticked
   * locations would lose stock. */
  keptVariantIds: Set<string>;
};

/**
 * The Colour & size adjustment modal's ticked locations, plus the "move stock from removed
 * locations" mapping Update needs when a location is unticked on a variant that still holds stock
 * there. Same remap rules as the bulk "Set locations" modal (see useBulkLocations).
 */
export function useLocationSelection({ product, locationOptions, keptVariantIds }: UseLocationSelectionArgs) {
  const [picked, setPicked] = useState<string[] | null>(null);
  const [remap, setRemap] = useState<Record<string, string>>({});

  // Until the user picks, start from where the product's variants already are, else the first location.
  const defaultIds = useMemo(() => {
    const atVariants = new Set(product.variants.flatMap((v) => v.locations.map((l) => l.id)));
    const existing = locationOptions.filter((o) => atVariants.has(o.id)).map((o) => o.id);
    return existing.length > 0 ? existing : locationOptions.slice(0, 1).map((o) => o.id);
  }, [product.variants, locationOptions]);
  const locationIds = picked ?? defaultIds;

  const remapNeeds = useMemo(
    () => bulkRemovedHolding(product.variants, keptVariantIds, locationIds, 'replace'),
    [product.variants, keptVariantIds, locationIds]
  );
  // A single destination is automatic — its value is used even before the select is touched.
  const resolvedRemap = useMemo(() => {
    if (remapNeeds.length === 0 || locationIds.length !== 1) return remap;
    return Object.fromEntries(remapNeeds.map((n) => [n.id, remap[n.id] ?? locationIds[0]]));
  }, [remap, remapNeeds, locationIds]);
  const remapComplete = remapNeeds.every((n) => resolvedRemap[n.id] && locationIds.includes(resolvedRemap[n.id]));

  const setLocationIds = (ids: string[]) => {
    setPicked(ids);
    // Destinations changed — drop mappings that no longer point at a ticked location.
    setRemap((prev) => Object.fromEntries(Object.entries(prev).filter(([, to]) => ids.includes(to))));
  };

  return {
    ids: locationIds,
    options: locationOptions,
    set: setLocationIds,
    error: locationOptions.length > 0 && locationIds.length === 0 ? 'Pick at least one location' : null,
    remapNeeds: remapNeeds.map((n) => ({ ...n, detail: `${formatNumber(n.totalQty)} across ${n.variantCount} variant${n.variantCount === 1 ? '' : 's'}` })),
    remap: resolvedRemap,
    setRemapTarget: (fromId: string, toId: string) => setRemap((prev) => ({ ...prev, [fromId]: toId })),
    remapComplete,
    clearRemap: () => setRemap({}),
  };
}

export type LocationSelection = ReturnType<typeof useLocationSelection>;
