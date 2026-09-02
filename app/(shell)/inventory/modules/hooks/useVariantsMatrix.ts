'use client';

import { useMemo, useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { getStatus, makeSwatchResolver, quickFilterMatches, summariseVariants } from '../utils';
import type { ColourOption, ProductRecord, QuickFilterId, VariantRow, VariantStatus } from '../types';

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
  /** The active price quick filter (buying/profit/selling) — null shows every variant. Applied
   * entirely client-side against this product's own already-loaded variants, so switching it
   * never triggers a request or moves the record stepper's position. */
  quickFilter: QuickFilterId | null;
  onVariantSaved: (product: ProductRecord) => void;
};

export function useVariantsMatrix({ product, sizes, colours, quickFilter, onVariantSaved }: UseVariantsMatrixArgs) {
  // Filters are tagged with the product they belong to, so changing product
  // resets them without an effect having to clear five pieces of state.
  const [stored, setStored] = useState<{ productId: string; filters: MatrixFilters } | null>(null);
  const filters = stored && stored.productId === product?.id ? stored.filters : DEFAULT_FILTERS;

  // Only one row edits at a time, tagged with its product so navigation exits it.
  const [storedEditingRow, setStoredEditingRow] = useState<{ productId: string; rowId: string } | null>(null);
  const editingRowId = storedEditingRow && storedEditingRow.productId === product?.id ? storedEditingRow.rowId : null;

  const [rowDraft, setRowDraft] = useState<Partial<VariantRow> | null>(null);
  const { request, loading: saving } = useRequest<ProductRecord>();

  // Tagged with its product so navigation exits any pending confirmation.
  const [storedDeleteTarget, setStoredDeleteTarget] = useState<{ productId: string; variant: VariantRow } | null>(null);
  const deleteTarget = storedDeleteTarget && storedDeleteTarget.productId === product?.id ? storedDeleteTarget.variant : null;
  const { request: requestDelete, loading: deleting } = useRequest<ProductRecord>();

  const patch = (next: Partial<MatrixFilters>) => {
    if (!product) return;
    setStored({ productId: product.id, filters: { ...filters, ...next } });
  };

  // The row being edited shows its unsaved draft; every other row shows the server value.
  const variants = useMemo(() => {
    const base = product?.variants ?? [];
    if (!editingRowId || !rowDraft) return base;
    return base.map((v) => (v.id === editingRowId ? { ...v, ...rowDraft } : v));
  }, [product, editingRowId, rowDraft]);

  // Union of the product's defined palette and any colour actually present on a variant, so a
  // variant whose colour isn't in the defined palette (e.g. a migrated "Default Title") still gets
  // a pill instead of becoming unselectable the moment another pill is clicked.
  const colourNames = useMemo(() => {
    const names = colours.map((c) => c.name);
    const seen = new Set(names.map((n) => n.toLowerCase()));
    for (const v of product?.variants ?? []) {
      if (seen.has(v.colour.toLowerCase())) continue;
      seen.add(v.colour.toLowerCase());
      names.push(v.colour);
    }
    return names;
  }, [colours, product]);

  const activeColours = filters.colours ?? colourNames;
  const allColoursSelected = filters.colours === null || filters.colours.length === colourNames.length;

  // Resolved rather than stored, so editing a size out of the list falls back to
  // "All sizes" instead of leaving the dropdown on a value it no longer offers.
  const sizeFilter = sizes.includes(filters.size) ? filters.size : '';

  const rows = useMemo(() => {
    return variants.filter((v) => {
      if (quickFilter && !quickFilterMatches(quickFilter, v)) return false;
      if (!allColoursSelected && !activeColours.some((c) => c.toLowerCase() === v.colour.toLowerCase())) return false;
      if (sizeFilter && v.size !== sizeFilter) return false;
      if (filters.status && getStatus(v) !== filters.status) return false;
      // Unchecked (default) shows every variant; checking it narrows to zero-or-below stock only.
      if (filters.showZeroStock && v.stockOnHand > 0) return false;
      return true;
    });
  }, [variants, quickFilter, allColoursSelected, activeColours, sizeFilter, filters.status, filters.showZeroStock]);

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

  const startRowEdit = (rowId: string) => {
    if (!product) return;
    setStoredEditingRow({ productId: product.id, rowId });
    setRowDraft(null);
  };

  const cancelRowEdit = () => {
    setStoredEditingRow(null);
    setRowDraft(null);
  };

  const setVariantEdit = (variantId: string, patchValue: Partial<VariantRow>) => {
    if (editingRowId !== variantId) return;
    setRowDraft((prev) => ({ ...prev, ...patchValue }));
  };

  const saveRowEdit = () => {
    if (!product || !editingRowId || !rowDraft) {
      cancelRowEdit();
      return;
    }
    request({
      url: `/api/inventory/catalog/${product.id}/variants/${editingRowId}`,
      method: 'PATCH',
      data: rowDraft as unknown as Record<string, unknown>,
      successMessage: 'Variant updated',
      onSuccess: ({ data }) => {
        onVariantSaved(data);
        cancelRowEdit();
      },
    });
  };

  const requestDeleteRow = (variant: VariantRow) => {
    if (!product) return;
    setStoredDeleteTarget({ productId: product.id, variant });
  };

  const cancelDeleteRow = () => setStoredDeleteTarget(null);

  const confirmDeleteRow = () => {
    if (!product || !deleteTarget) return;
    requestDelete({
      url: `/api/inventory/catalog/${product.id}/variants/${deleteTarget.id}`,
      method: 'DELETE',
      successMessage: 'Variant deleted',
      onSuccess: ({ data }) => {
        onVariantSaved(data);
        setStoredDeleteTarget(null);
      },
    });
  };

  return {
    colours,
    colourNames,
    sizes,
    rows,
    totals,
    editingRowId,
    rowDraft,
    saving,
    startRowEdit,
    cancelRowEdit,
    saveRowEdit,
    setVariantEdit,
    deleteTarget,
    deleting,
    requestDeleteRow,
    cancelDeleteRow,
    confirmDeleteRow,
    swatchOf: makeSwatchResolver(colours),
    hiddenCount: variants.length - rows.length,
    allColoursSelected,
    isColourActive: (colour: string) => activeColours.some((c) => c.toLowerCase() === colour.toLowerCase()),
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
