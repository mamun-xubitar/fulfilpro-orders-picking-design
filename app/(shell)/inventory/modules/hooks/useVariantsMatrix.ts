'use client';

import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { getStatus, naturalCompare, quickFilterMatches, sortVariantsForDisplay, summariseVariants, variantDraftChanges, variantPatchBody } from '../utils';
import type { ProductRecord, QuickFilterId, VariantRow, VariantStatus } from '../types';

type MatrixFilters = {
  status: VariantStatus | null;
  showZeroStock: boolean;
  /** Free-text filter over SKU, barcode, colour and size (case-insensitive). */
  search: string;
  selected: string[];
  /** Colours/sizes hidden from the table, lower-cased. Stored as "hidden" rather than "checked"
   * so the default (nothing hidden) shows every row, and a colour/size declared later on the
   * product shows up checked without this filter having to be told about it. */
  hiddenColours: string[];
  hiddenSizes: string[];
};

const DEFAULT_FILTERS: MatrixFilters = { status: null, showZeroStock: false, search: '', selected: [], hiddenColours: [], hiddenSizes: [] };

// Module-level so its identity is stable across renders — a fresh {} every render would defeat
// the `variants` useMemo below whenever there's no active product draft.
const EMPTY_DRAFTS: Record<string, Partial<VariantRow>> = {};

/** The Variants / stock table's Colour panel and Sizes dropdown are both client-side filters over
 * `names` (declared on the product) — never a write to the product's variants. `hidden` holds the
 * lower-cased names currently unchecked; `setHidden` replaces it wholesale via the caller's own
 * `patch`, same as every other matrix filter. */
export type OptionFilter = {
  items: { name: string; checked: boolean }[];
  toggle: (name: string) => void;
  toggleAll: (checked: boolean) => void;
  allChecked: boolean;
  someChecked: boolean;
  checkedCount: number;
};

function buildOptionFilter(names: string[], hidden: string[], setHidden: (next: string[]) => void): OptionFilter {
  const hiddenSet = new Set(hidden);
  const items = names.map((name) => ({ name, checked: !hiddenSet.has(name.toLowerCase()) }));
  const checkedCount = items.filter((i) => i.checked).length;
  return {
    items,
    toggle: (name: string) => {
      const key = name.toLowerCase();
      setHidden(hiddenSet.has(key) ? hidden.filter((h) => h !== key) : [...hidden, key]);
    },
    toggleAll: (checked: boolean) => setHidden(checked ? [] : names.map((n) => n.toLowerCase())),
    allChecked: items.length > 0 && checkedCount === items.length,
    someChecked: checkedCount > 0,
    checkedCount,
  };
}

type UseVariantsMatrixArgs = {
  product: ProductRecord | null;
  /** Product-level lists, draft-aware — owned by the details hook. */
  sizes: string[];
  /** The active price quick filter (buying/profit/selling) — null shows every variant. Applied
   * entirely client-side against this product's own already-loaded variants, so switching it
   * never triggers a request or moves the record stepper's position. */
  quickFilter: QuickFilterId | null;
  onVariantSaved: (product: ProductRecord) => void;
};

export function useVariantsMatrix({ product, sizes, quickFilter, onVariantSaved }: UseVariantsMatrixArgs) {
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
  // Same idea for a single input's own save (`${variantId}:${field}`).
  const [savingCell, setSavingCell] = useState<string | null>(null);

  // Tagged with its product so navigation exits any pending confirmation.
  const [storedDeleteTarget, setStoredDeleteTarget] = useState<{ productId: string; variant: VariantRow } | null>(null);
  const deleteTarget = storedDeleteTarget && storedDeleteTarget.productId === product?.id ? storedDeleteTarget.variant : null;
  const { request: requestDelete, loading: deleting } = useRequest<ProductRecord>();

  // Bulk delete confirmation, tagged with its product like the single-row one above.
  const [storedBulkDeleteOpen, setStoredBulkDeleteOpen] = useState<string | null>(null);
  const bulkDeleteOpen = storedBulkDeleteOpen !== null && storedBulkDeleteOpen === product?.id;
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Functional update (item 6a) — reads the previous *stored* state itself rather than closing
  // over the `filters` computed for this render, so a filter change made while the inline table
  // and the full-view modal are both mounted (they share this same hook instance) is never lost
  // to a stale-closure overwrite between the two renders that follow it.
  const patch = (next: Partial<MatrixFilters>) => {
    if (!product) return;
    setStored((prev) => {
      const base = prev && prev.productId === product.id ? prev.filters : DEFAULT_FILTERS;
      return { productId: product.id, filters: { ...base, ...next } };
    });
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

  const rows = useMemo(() => {
    // The zero-stock filter reads the *saved* stock, not the draft: it must hold even for rows
    // with unsaved edits (e.g. after a "Set all" fill stages a draft on every visible row),
    // otherwise the dirty-row pin below would let every row through and the filter would look dead.
    const term = filters.search.trim().toLowerCase();
    const savedStock = new Map((product?.variants ?? []).map((v) => [v.id, v.stockOnHand]));
    const filtered = variants.filter((v) => {
      if (filters.showZeroStock && (savedStock.get(v.id) ?? v.stockOnHand) !== 0) return false;
      // Unsaved edits must never hide their own row: every filter below reads the
      // draft-overlaid values, so typing a value that breaks the active filter (e.g.
      // raising the sell price while "Sell < $1" is active) would otherwise unmount the row
      // mid-edit and make Save unreachable. Pinned dirty rows re-evaluate normally once
      // saved/reverted.
      if (dirtyById[v.id]) return true;
      if (quickFilter && !quickFilterMatches(quickFilter, v)) return false;
      if (filters.hiddenColours.includes(v.colour.toLowerCase())) return false;
      if (filters.hiddenSizes.includes(v.size.toLowerCase())) return false;
      if (filters.status && getStatus(v) !== filters.status) return false;
      if (term && ![v.sku, v.barcode, v.colour, v.size].some((f) => (f ?? '').toLowerCase().includes(term))) return false;
      return true;
    });
    // Grouped by colour (A->Z) so same-colour rows stay together; within a colour, ordered by
    // the product's own declared size order — see sortVariantsForDisplay, shared with the
    // publish/bulk-update store draft tables so all three read the same way.
    return sortVariantsForDisplay(filtered, sizes);
  }, [variants, sizes, quickFilter, filters.hiddenColours, filters.hiddenSizes, filters.status, filters.showZeroStock, filters.search, dirtyById, product]);

  // Selection is narrowed to the visible rows here rather than pruned in an effect.
  const selectedIds = useMemo(() => {
    const visible = new Set(rows.map((r) => r.id));
    return new Set(filters.selected.filter((id) => visible.has(id)));
  }, [rows, filters.selected]);

  const totals = useMemo(() => summariseVariants(rows), [rows]);

  const allRowsSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  const setVariantEdit = (variantId: string, patchValue: Partial<VariantRow>) => {
    if (!product) return;
    setStoredDrafts((prev) => {
      const base = prev && prev.productId === product.id ? prev.drafts : {};
      return { productId: product.id, drafts: { ...base, [variantId]: { ...base[variantId], ...patchValue } } };
    });
  };

  /** Bulk column fill (item 9) — writes `value` onto the given field for every currently
   * *visible* row (respecting the colour/size/status/zero-stock filters), same as if each row
   * had been edited by hand. Each row keeps its own per-row Save; this only stages the drafts. */
  const fillColumn = (field: 'stockOnHand' | 'allocated' | 'sellPrice', value: number) => {
    for (const row of rows) setVariantEdit(row.id, { [field]: value });
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
      data: variantPatchBody(changes),
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

  /** Drops just one field of a row's draft — what a per-input save clears, leaving the row's other
   * unsaved edits in place. */
  const clearFieldDraft = (variantId: string, field: keyof VariantRow) => {
    setStoredDrafts((prev) => {
      if (!prev || !prev.drafts[variantId] || !(field in prev.drafts[variantId])) return prev;
      const { [field]: _dropped, ...rest } = prev.drafts[variantId];
      void _dropped;
      const next = { ...prev.drafts };
      if (Object.keys(rest).length === 0) delete next[variantId];
      else next[variantId] = rest;
      return { productId: prev.productId, drafts: next };
    });
  };

  /** Saves a single input — the PATCH carries only that field, so the row's other unsaved edits
   * are neither sent nor lost. */
  const saveField = (variantId: string, field: keyof VariantRow) => {
    const changes = dirtyById[variantId];
    if (!product || !changes || !(field in changes)) return;
    const key = `${variantId}:${field}`;
    setSavingCell(key);
    request({
      url: `/api/inventory/catalog/${product.id}/variants/${variantId}`,
      method: 'PATCH',
      data: variantPatchBody({ [field]: changes[field] } as Partial<VariantRow>),
      successMessage: 'Variant updated',
      onSuccess: ({ data }) => {
        setSavingCell(null);
        onVariantSaved(data);
        clearFieldDraft(variantId, field);
      },
      onError: () => setSavingCell(null),
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

  // Declared colours, A->Z — same list the Colour & size adjustment modal shows for this axis.
  const colourNames = useMemo(() => [...(product?.colours ?? [])].map((c) => c.name).sort(naturalCompare), [product]);
  const colourFilter = buildOptionFilter(colourNames, filters.hiddenColours, (hiddenColours) => patch({ hiddenColours }));
  const sizeFilter = buildOptionFilter(sizes, filters.hiddenSizes, (hiddenSizes) => patch({ hiddenSizes }));

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
    sizes,
    colourFilter,
    sizeFilter,
    rows,
    totals,
    dirtyById,
    isRowDirty: (id: string) => dirtyById[id] !== undefined,
    savingRowId,
    savingCell,
    saveRow,
    saveField,
    revertRow,
    setVariantEdit,
    fillColumn,
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
    hiddenCount: variants.length - rows.length,
    statusFilter: filters.status,
    setStatusFilter: (status: VariantStatus) => patch({ status: filters.status === status ? null : status }),
    showZeroStock: filters.showZeroStock,
    setShowZeroStock: (showZeroStock: boolean) => patch({ showZeroStock }),
    search: filters.search,
    setSearch: (search: string) => patch({ search }),
    selectedIds,
    toggleRow: (id: string) => patch({ selected: selectedIds.has(id) ? [...selectedIds].filter((s) => s !== id) : [...selectedIds, id] }),
    allRowsSelected,
    clearSelection: () => patch({ selected: [] }),
    toggleAllRows: () => patch({ selected: allRowsSelected ? [] : rows.map((r) => r.id) }),
  };
}
