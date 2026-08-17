'use client';

import { useMemo, useState } from 'react';
import { getStatus, makeSwatchResolver, summariseVariants } from '../utils';
import type { ColourOption, ProductRecord, VariantRow, VariantStatus } from '../types';

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
  /** Product-level lists, draft-aware — owned by the details hook. */
  sizes: string[];
  colours: ColourOption[];
  /** Local, unsaved row edits keyed by variant id — owned by the composer. */
  variantEdits: Record<string, Partial<VariantRow>>;
  setVariantEdit: (variantId: string, patch: Partial<VariantRow>) => void;
  clearVariantEdit: (variantId: string) => void;
};

export function useVariantsMatrix({ product, sizes, colours, variantEdits, setVariantEdit, clearVariantEdit }: UseVariantsMatrixArgs) {
  // Filters are tagged with the product they belong to, so changing product
  // resets them without an effect having to clear five pieces of state.
  const [stored, setStored] = useState<{ productId: string; filters: MatrixFilters } | null>(null);
  const filters = stored && stored.productId === product?.id ? stored.filters : DEFAULT_FILTERS;

  // Only one row edits at a time, tagged with its product so navigation exits it.
  const [storedEditingRow, setStoredEditingRow] = useState<{ productId: string; rowId: string } | null>(null);
  const editingRowId = storedEditingRow && storedEditingRow.productId === product?.id ? storedEditingRow.rowId : null;

  const patch = (next: Partial<MatrixFilters>) => {
    if (!product) return;
    setStored({ productId: product.id, filters: { ...filters, ...next } });
  };

  /** Variants with any unsaved row edit applied — the basis for every derived value. */
  const variants = useMemo<VariantRow[]>(() => {
    if (!product) return [];
    return product.variants.map((v) => (v.id in variantEdits ? { ...v, ...variantEdits[v.id] } : v));
  }, [product, variantEdits]);

  // Memoised so the `rows` filter keeps a stable dep when no colour is picked.
  const colourNames = useMemo(() => colours.map((c) => c.name), [colours]);

  const activeColours = filters.colours ?? colourNames;
  const allColoursSelected = filters.colours === null || filters.colours.length === colours.length;

  // Resolved rather than stored, so editing a size out of the list falls back to
  // "All sizes" instead of leaving the dropdown on a value it no longer offers.
  const sizeFilter = sizes.includes(filters.size) ? filters.size : '';

  const rows = useMemo(() => {
    return variants.filter((v) => {
      if (!allColoursSelected && !activeColours.some((c) => c.toLowerCase() === v.colour.toLowerCase())) return false;
      if (sizeFilter && v.size !== sizeFilter) return false;
      if (filters.status && getStatus(v) !== filters.status) return false;
      if (!filters.showZeroStock && v.stockOnHand === 0) return false;
      return true;
    });
  }, [variants, allColoursSelected, activeColours, sizeFilter, filters.status, filters.showZeroStock]);

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
    editingRowId,
    startRowEdit: (rowId: string) => product && setStoredEditingRow({ productId: product.id, rowId }),
    /** Discards this row's draft. */
    cancelRowEdit: () => {
      if (editingRowId) clearVariantEdit(editingRowId);
      setStoredEditingRow(null);
    },
    /** Demo mode: exits the row without writing back to `products`. */
    saveRowEdit: () => setStoredEditingRow(null),
    setVariantEdit,
    swatchOf: makeSwatchResolver(colours),
    hiddenCount: variants.length - rows.length,
    allColoursSelected,
    isColourActive: (colour: string) => !allColoursSelected && activeColours.some((c) => c.toLowerCase() === colour.toLowerCase()),
    toggleColour,
    selectAllColours: () => patch({ colours: null }),
    sizeFilter,
    setSizeFilter: (size: string) => patch({ size }),
    statusFilter: filters.status,
    setStatusFilter: (status: VariantStatus) => patch({ status: filters.status === status ? null : status }),
    showZeroStock: filters.showZeroStock,
    setShowZeroStock: (showZeroStock: boolean) => patch({ showZeroStock }),
    selectedIds,
    toggleRow: (id: string) => patch({ selected: selectedIds.has(id) ? [...selectedIds].filter((s) => s !== id) : [...selectedIds, id] }),
    allRowsSelected,
    toggleAllRows: () => patch({ selected: allRowsSelected ? [] : rows.map((r) => r.id) }),
  };
}
