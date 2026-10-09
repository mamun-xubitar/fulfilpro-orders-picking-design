'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { ADJUSTMENT_PRESETS } from '../constants';
import type { AdjustmentBatchRecord, ProductRecord, StockAdjustmentReasonValue, VariantRow } from '../types';
import { adjustTarget } from '../utils';

const REASONS: StockAdjustmentReasonValue[] = ['DAMAGED', 'LOST', 'FOUND', 'RETURN', 'CORRECTION', 'OTHER'];

type AdjustmentRowState = { delta: string; reason: StockAdjustmentReasonValue; note: string };

/** The locations the given variants are kept at, deduped, A→Z — what the modal's Location dropdown offers. */
function locationOptionsFor(variants: VariantRow[]): { id: string; name: string }[] {
  const byId = new Map<string, string>();
  for (const v of variants) for (const l of v.locations) byId.set(l.id, l.name);
  return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

type UseAdjustmentsArgs = {
  product: ProductRecord | null;
  /** Patches the product in place with the server's response — no full-catalogue refetch, so
   * the page never flashes to skeletons while this modal is open. */
  onSaved: (product: ProductRecord) => void;
};

export function useAdjustments({ product, onSaved }: UseAdjustmentsArgs) {
  const [modalOpen, setModalOpen] = useState(false);
  const [variantIds, setVariantIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<Record<string, AdjustmentRowState>>({});
  // One location for the whole modal: every row adjusts the stock held there ('' = unassigned stock).
  const [locationId, setLocationIdState] = useState('');
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<AdjustmentBatchRecord[]>([]);
  const { request: requestHistory, loading: loadingHistory } = useRequest<{ adjustments: AdjustmentBatchRecord[] }>();

  /** Opens the modal for the given variants, or every variant on the product when omitted
   * (the "New adjustment" entry point in Bottom panels vs. the matrix's "Adjust Stock" button).
   * Every row starts unchecked — a row is selected either by ticking it or by typing an
   * adjustment into it (see `setRowField`), so "Save all" never touches a row the user hasn't
   * actually looked at. */
  const openModal = (ids?: string[]) => {
    if (!product) return;
    const targetIds = ids && ids.length > 0 ? ids : product.variants.map((v) => v.id);
    setVariantIds(targetIds);
    setSelectedIds(new Set());
    const idSet = new Set(targetIds);
    setLocationIdState(locationOptionsFor(product.variants.filter((v) => idSet.has(v.id)))[0]?.id ?? '');
    setRows(Object.fromEntries(targetIds.map((id) => [id, { delta: '', reason: 'CORRECTION' as StockAdjustmentReasonValue, note: '' }])));
    setRowErrors({});
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  const targetVariants = (product?.variants ?? []).filter((v) => variantIds.includes(v.id));
  const locationOptions = locationOptionsFor(targetVariants);
  // A variant kept only at other locations can't be adjusted here — its row is disabled.
  const adjustableIds = new Set(targetVariants.filter((v) => adjustTarget(v, locationId).kind !== 'absent').map((v) => v.id));
  const adjustableList = variantIds.filter((id) => adjustableIds.has(id));

  const setLocationId = (id: string) => {
    setLocationIdState(id);
    const ids = new Set(targetVariants.filter((v) => adjustTarget(v, id).kind !== 'absent').map((v) => v.id));
    setSelectedIds((prev) => new Set([...prev].filter((v) => ids.has(v))));
    setRowErrors({});
  };

  const toggleSelect = (variantId: string) => {
    if (!adjustableIds.has(variantId)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(variantId)) next.delete(variantId);
      else next.add(variantId);
      return next;
    });
  };
  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.size === adjustableList.length ? new Set() : new Set(adjustableList)));
  };
  const allSelected = adjustableList.length > 0 && selectedIds.size === adjustableList.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < adjustableList.length;

  const setRowField = (variantId: string, patch: Partial<AdjustmentRowState>) => {
    setRows((prev) => ({ ...prev, [variantId]: { ...prev[variantId], ...patch } }));
    setRowErrors((prev) => {
      if (!(variantId in prev)) return prev;
      const next = { ...prev };
      delete next[variantId];
      return next;
    });
    // Typing an adjustment selects the row, so a value never sits uncommitted in an unselected
    // (and now non-disabled) input without "Save all" picking it up.
    if (patch.delta && adjustableIds.has(variantId)) setSelectedIds((prev) => (prev.has(variantId) ? prev : new Set(prev).add(variantId)));
  };

  /** Writes one delta (or clears it) into every currently-selected row — the chips strip above
   * the table drives this instead of a per-row preset dropdown. */
  const applyChip = (delta: number | null) => {
    setRows((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) next[id] = { ...next[id], delta: delta === null ? '' : String(delta) };
      return next;
    });
    setRowErrors((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) delete next[id];
      return next;
    });
  };

  const dirtyCount = variantIds.filter((id) => selectedIds.has(id) && adjustableIds.has(id) && rows[id]?.delta && Number(rows[id]?.delta) !== 0).length;

  const postAdjustments = async (
    items: { variantId: string; locationId?: string; delta: number; reason: StockAdjustmentReasonValue; note?: string }[]
  ): Promise<ProductRecord | null> => {
    const res = await fetch(`/api/inventory/catalog/${product!.id}/adjustments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items.length === 1 ? items[0] : { items }),
    });
    const json = (await res.json()) as { success: boolean; message: string; data?: ProductRecord | null };
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to save adjustment');
    return json.data ?? null;
  };

  /** Saves one row without closing the modal, so each variant can be committed independently. */
  const saveRow = async (variantId: string) => {
    if (!product) return;
    const row = rows[variantId];
    if (!adjustableIds.has(variantId)) return;
    const delta = Number(row?.delta);
    if (!row?.delta || !Number.isFinite(delta) || delta === 0) {
      setRowErrors((prev) => ({ ...prev, [variantId]: 'Enter a non-zero quantity' }));
      return;
    }
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[variantId];
      return next;
    });
    setSavingIds((prev) => new Set(prev).add(variantId));
    try {
      const updated = await postAdjustments([{ variantId, locationId: locationId || undefined, delta, reason: row.reason, note: row.note || undefined }]);
      toast.success('Stock adjusted');
      setRowField(variantId, { delta: '' });
      if (updated) onSaved(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save adjustment');
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(variantId);
        return next;
      });
    }
  };

  /** Saves every selected row with a non-zero delta in one request; unselected or zero-delta
   * rows are skipped. The modal stays open — saved rows are cleared and deselected so the next
   * batch can be entered straight away. */
  const saveAll = async () => {
    if (!product) return;
    const items = variantIds
      .filter((id) => selectedIds.has(id) && adjustableIds.has(id))
      .map((variantId) => ({ variantId, row: rows[variantId] }))
      .filter(({ row }) => row?.delta && Number(row.delta) !== 0)
      .map(({ variantId, row }) => ({ variantId, locationId: locationId || undefined, delta: Number(row.delta), reason: row.reason, note: row.note || undefined }));

    if (items.length === 0) {
      toast.info('Enter a quantity change for at least one selected row');
      return;
    }

    setSavingAll(true);
    try {
      const updated = await postAdjustments(items);
      toast.success(items.length === 1 ? 'Stock adjusted' : `Adjustment saved — ${items.length} variants`);
      const savedIds = new Set(items.map((i) => i.variantId));
      setRows((prev) => {
        const next = { ...prev };
        for (const id of savedIds) next[id] = { ...next[id], delta: '' };
        return next;
      });
      setSelectedIds((prev) => new Set([...prev].filter((id) => !savedIds.has(id))));
      if (updated) onSaved(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save adjustments');
    } finally {
      setSavingAll(false);
    }
  };

  const openHistory = () => {
    if (!product) return;
    setHistoryOpen(true);
    requestHistory({
      url: `/api/inventory/catalog/${product.id}/adjustments`,
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) => setHistory(data.adjustments),
    });
  };
  const closeHistory = () => setHistoryOpen(false);

  return {
    reasons: REASONS,
    presets: ADJUSTMENT_PRESETS,
    modalOpen,
    openModal,
    closeModal,
    variantIds,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    allSelected,
    someSelected,
    rows,
    locationId,
    setLocationId,
    locationOptions,
    adjustableIds,
    setRowField,
    applyChip,
    dirtyCount,
    rowErrors,
    savingIds,
    savingAll,
    saveRow,
    saveAll,
    historyOpen,
    openHistory,
    closeHistory,
    history,
    loadingHistory,
  };
}
