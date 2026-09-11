'use client';

import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { getStatus, makeSwatchResolver, quickFilterMatches, sortVariantsForDisplay, summariseVariants, variantDraftChanges } from '../utils';
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

// Module-level so its identity is stable across renders — a fresh {} every render would defeat
// the `variants` useMemo below whenever there's no active product draft.
const EMPTY_DRAFTS: Record<string, Partial<VariantRow>> = {};

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

  // Every row can carry its own unsaved draft at once (always-edit mode), tagged with the
  // product they belong to so navigation discards them without an effect having to reset
  // anything — same pattern as `stored` above.
  const [storedDrafts, setStoredDrafts] = useState<{ productId: string; drafts: Record<string, Partial<VariantRow>> } | null>(null);
  const drafts = storedDrafts && storedDrafts.productId === product?.id ? storedDrafts.drafts : EMPTY_DRAFTS;
  const { request } = useRequest<ProductRecord>();
  // Which row's own PATCH is currently in flight — useRequest's own `loading` is shared across
  // every row (one hook instance), so this is what lets only the row actually being saved show a
  // spinner instead of all of them lighting up together.
  const [savingRowId, setSavingRowId] = useState<string | null>(null);

  // Tagged with its product so navigation exits any pending confirmation.
  const [storedDeleteTarget, setStoredDeleteTarget] = useState<{ productId: string; variant: VariantRow } | null>(null);
  const deleteTarget = storedDeleteTarget && storedDeleteTarget.productId === product?.id ? storedDeleteTarget.variant : null;
  const { request: requestDelete, loading: deleting } = useRequest<ProductRecord>();

  // Bulk delete confirmation, tagged with its product like the single-row one above.
  const [storedBulkDeleteOpen, setStoredBulkDeleteOpen] = useState<string | null>(null);
  const bulkDeleteOpen = storedBulkDeleteOpen !== null && storedBulkDeleteOpen === product?.id;
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const patch = (next: Partial<MatrixFilters>) => {
    if (!product) return;
    setStored({ productId: product.id, filters: { ...filters, ...next } });
  };

  // Every row with a draft shows it overlaid; every other row is returned *by reference* —
  // which is what keeps VariantsMatrixRow's memo effective, since an edit to one row leaves
  // every other row's `variant` prop identity untouched.
  const variants = useMemo(() => {
    const base = product?.variants ?? [];
    if (Object.keys(drafts).length === 0) return base;
    return base.map((v) => (drafts[v.id] ? { ...v, ...drafts[v.id] } : v));
  }, [product, drafts]);

  // The exact PATCH body for each dirty row, keyed by variant id — computed by diffing every
  // row's draft against its server value (not by tracking which fields were merely touched), so
  // typing a value and typing it back to the original disarms that row's Save button. Doubles as
  // the dirty-row lookup: presence in this map is what the table uses to decide whether a row
  // shows its Save/Revert actions.
  const dirtyById = useMemo(() => {
    const map: Record<string, Partial<VariantRow>> = {};
    for (const v of product?.variants ?? []) {
      const changes = variantDraftChanges(v, drafts[v.id]);
      if (Object.keys(changes).length > 0) map[v.id] = changes;
    }
    return map;
  }, [product, drafts]);

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
    // Sorted A->Z (case-insensitive) so the colour filter pills read the same way as the
    // matrix rows, which are grouped by colour via sortVariantsForDisplay.
    return names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [colours, product]);

  const activeColours = filters.colours ?? colourNames;
  const allColoursSelected = filters.colours === null || filters.colours.length === colourNames.length;

  // Resolved rather than stored, so editing a size out of the list falls back to
  // "All sizes" instead of leaving the dropdown on a value it no longer offers.
  const sizeFilter = sizes.includes(filters.size) ? filters.size : '';

  const rows = useMemo(() => {
    const filtered = variants.filter((v) => {
      if (quickFilter && !quickFilterMatches(quickFilter, v)) return false;
      if (!allColoursSelected && !activeColours.some((c) => c.toLowerCase() === v.colour.toLowerCase())) return false;
      if (sizeFilter && v.size !== sizeFilter) return false;
      if (filters.status && getStatus(v) !== filters.status) return false;
      // Unchecked (default) shows every variant; checking it narrows to zero-or-below stock only.
      if (filters.showZeroStock && v.stockOnHand > 0) return false;
      return true;
    });
    // Grouped by colour (A->Z) so same-colour rows stay together; within a colour, ordered by
    // the product's own declared size order — see sortVariantsForDisplay, shared with the
    // publish/bulk-update store draft tables so all three read the same way.
    return sortVariantsForDisplay(filtered, sizes);
  }, [variants, sizes, quickFilter, allColoursSelected, activeColours, sizeFilter, filters.status, filters.showZeroStock]);

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

  const setVariantEdit = (variantId: string, patchValue: Partial<VariantRow>) => {
    if (!product) return;
    setStoredDrafts((prev) => {
      const base = prev && prev.productId === product.id ? prev.drafts : {};
      return { productId: product.id, drafts: { ...base, [variantId]: { ...base[variantId], ...patchValue } } };
    });
  };

  /** Drops one row's draft — used both after a successful save (the fresh server value is now
   * current) and as the row's own Revert action while dirty. */
  const clearRowDraft = (variantId: string) => {
    setStoredDrafts((prev) => {
      if (!prev || !prev.drafts[variantId]) return prev;
      const next = { ...prev.drafts };
      delete next[variantId];
      return { productId: prev.productId, drafts: next };
    });
  };

  const revertRow = (variantId: string) => clearRowDraft(variantId);

  const saveRow = (variantId: string) => {
    const changes = dirtyById[variantId];
    if (!product || !changes) return;
    setSavingRowId(variantId);
    request({
      url: `/api/inventory/catalog/${product.id}/variants/${variantId}`,
      method: 'PATCH',
      data: changes as unknown as Record<string, unknown>,
      successMessage: 'Variant updated',
      onSuccess: ({ data }) => {
        setSavingRowId(null);
        onVariantSaved(data);
        clearRowDraft(variantId);
      },
      // useRequest has no onSettled — savingRowId must be cleared on both branches, since a
      // validation/network failure leaves the draft in place for the admin to fix and retry.
      onError: () => setSavingRowId(null),
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

  const requestBulkDelete = () => {
    if (!product || selectedIds.size === 0) return;
    setStoredBulkDeleteOpen(product.id);
  };

  const cancelBulkDelete = () => setStoredBulkDeleteOpen(null);

  /** Raw fetch (not useRequest) — mirrors useProductsTable's bulk actions, since the success
   * message's variant count is only known once the server responds. */
  const confirmBulkDelete = async () => {
    if (!product || selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const res = await fetch(`/api/inventory/catalog/${product.id}/variants/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantIds: [...selectedIds] }),
      });
      const json = (await res.json()) as { success: boolean; message: string; data: ProductRecord };
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to delete variants');
      toast.success(json.message);
      onVariantSaved(json.data);
      patch({ selected: [] });
      setStoredBulkDeleteOpen(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete variants');
    } finally {
      setBulkDeleting(false);
    }
  };

  return {
    colours,
    colourNames,
    sizes,
    rows,
    totals,
    dirtyById,
    isRowDirty: (id: string) => dirtyById[id] !== undefined,
    savingRowId,
    saveRow,
    revertRow,
    setVariantEdit,
    deleteTarget,
    deleting,
    requestDeleteRow,
    cancelDeleteRow,
    confirmDeleteRow,
    bulkDeleteOpen,
    bulkDeleting,
    requestBulkDelete,
    cancelBulkDelete,
    confirmBulkDelete,
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
