'use client';

import { useMemo, useState } from 'react';
import { getStatus, listColours, listSizes, summariseVariants } from '../utils';
import type { ProductRecord, VariantRow, VariantStatus } from '../types';

type MatrixFilters = {
  /** null means "untouched", which reads as every colour selected. */
  colours: string[] | null;
  size: string;
  status: VariantStatus | null;
  showZeroStock: boolean;
  selected: string[];
};

const DEFAULT_FILTERS: MatrixFilters = { colours: null, size: '', status: null, showZeroStock: false, selected: [] };

type UseVariantsMatrixArgs = {
  product: ProductRecord | null;
  /** Local, unsaved trigger edits keyed by variant id — owned by the composer. */
  triggerEdits: Record<string, number>;
  setTriggerEdit: (variantId: string, value: number) => void;
};

export function useVariantsMatrix({ product, triggerEdits, setTriggerEdit }: UseVariantsMatrixArgs) {
  // Filters are tagged with the product they belong to, so changing product
  // resets them without an effect having to clear five pieces of state.
  const [stored, setStored] = useState<{ productId: string; filters: MatrixFilters } | null>(null);
  const filters = stored && stored.productId === product?.id ? stored.filters : DEFAULT_FILTERS;

  const patch = (next: Partial<MatrixFilters>) => {
    if (!product) return;
    setStored({ productId: product.id, filters: { ...filters, ...next } });
  };

  /** Variants with any unsaved trigger edit applied — the basis for every derived value. */
  const variants = useMemo<VariantRow[]>(() => {
    if (!product) return [];
    return product.variants.map((v) => (v.id in triggerEdits ? { ...v, trigger: triggerEdits[v.id] } : v));
  }, [product, triggerEdits]);

  const colours = useMemo(() => listColours(variants), [variants]);
  const sizes = useMemo(() => listSizes(variants), [variants]);

  const activeColours = filters.colours ?? colours;
  const allColoursSelected = filters.colours === null || filters.colours.length === colours.length;

  const rows = useMemo(() => {
    return variants.filter((v) => {
      if (!allColoursSelected && !activeColours.some((c) => c.toLowerCase() === v.colour.toLowerCase())) return false;
      if (filters.size && v.size !== filters.size) return false;
      if (filters.status && getStatus(v) !== filters.status) return false;
      if (!filters.showZeroStock && v.stockOnHand === 0) return false;
      return true;
    });
  }, [variants, allColoursSelected, activeColours, filters.size, filters.status, filters.showZeroStock]);

  // Selection is narrowed to the visible rows here rather than pruned in an effect.
  const selectedIds = useMemo(() => {
    const visible = new Set(rows.map((r) => r.id));
    return new Set(filters.selected.filter((id) => visible.has(id)));
  }, [rows, filters.selected]);

  const totals = useMemo(() => summariseVariants(rows), [rows]);

  const toggleColour = (colour: string) => {
    const key = colour.toLowerCase();
    // From "all colours", the first click narrows to just that colour; further
    // clicks add or remove, and clearing the last one returns to showing all.
    if (allColoursSelected) {
      patch({ colours: [colour] });
      return;
    }
    const base = filters.colours ?? [];
    const has = base.some((c) => c.toLowerCase() === key);
    const next = has ? base.filter((c) => c.toLowerCase() !== key) : [...base, colour];
    patch({ colours: next.length === 0 ? null : next });
  };

  const allRowsSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  return {
    colours,
    sizes,
    rows,
    totals,
    hiddenCount: variants.length - rows.length,
    allColoursSelected,
    isColourActive: (colour: string) => !allColoursSelected && activeColours.some((c) => c.toLowerCase() === colour.toLowerCase()),
    toggleColour,
    selectAllColours: () => patch({ colours: null }),
    sizeFilter: filters.size,
    setSizeFilter: (size: string) => patch({ size }),
    statusFilter: filters.status,
    setStatusFilter: (status: VariantStatus) => patch({ status: filters.status === status ? null : status }),
    showZeroStock: filters.showZeroStock,
    setShowZeroStock: (showZeroStock: boolean) => patch({ showZeroStock }),
    selectedIds,
    toggleRow: (id: string) => patch({ selected: selectedIds.has(id) ? [...selectedIds].filter((s) => s !== id) : [...selectedIds, id] }),
    allRowsSelected,
    toggleAllRows: () => patch({ selected: allRowsSelected ? [] : rows.map((r) => r.id) }),
    triggerEdits,
    setTriggerEdit,
  };
}
