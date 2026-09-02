'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { ADJUSTMENT_PRESETS } from '../constants';
import type { ProductRecord, StockAdjustmentRecord, StockAdjustmentReasonValue } from '../types';

const REASONS: StockAdjustmentReasonValue[] = ['DAMAGED', 'LOST', 'FOUND', 'RETURN', 'CORRECTION', 'OTHER'];

type AdjustmentRowState = { delta: string; reason: StockAdjustmentReasonValue; note: string };

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
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<StockAdjustmentRecord[]>([]);
  const { request: requestHistory, loading: loadingHistory } = useRequest<{ adjustments: StockAdjustmentRecord[] }>();

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
    setRows(Object.fromEntries(targetIds.map((id) => [id, { delta: '', reason: 'CORRECTION' as StockAdjustmentReasonValue, note: '' }])));
    setRowErrors({});
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  const toggleSelect = (variantId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(variantId)) next.delete(variantId);
      else next.add(variantId);
      return next;
    });
  };
  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.size === variantIds.length ? new Set() : new Set(variantIds)));
  };
  const allSelected = variantIds.length > 0 && selectedIds.size === variantIds.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < variantIds.length;

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
    if (patch.delta) setSelectedIds((prev) => (prev.has(variantId) ? prev : new Set(prev).add(variantId)));
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

  const dirtyCount = variantIds.filter((id) => selectedIds.has(id) && rows[id]?.delta && Number(rows[id]?.delta) !== 0).length;

  const postAdjustments = async (items: { variantId: string; delta: number; reason: StockAdjustmentReasonValue; note?: string }[]): Promise<ProductRecord | null> => {
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
      const updated = await postAdjustments([{ variantId, delta, reason: row.reason, note: row.note || undefined }]);
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
   * rows are skipped. */
  const saveAll = async () => {
    if (!product) return;
    const items = variantIds
      .filter((id) => selectedIds.has(id))
      .map((variantId) => ({ variantId, row: rows[variantId] }))
      .filter(({ row }) => row?.delta && Number(row.delta) !== 0)
      .map(({ variantId, row }) => ({ variantId, delta: Number(row.delta), reason: row.reason, note: row.note || undefined }));

    if (items.length === 0) {
      toast.info('Enter a quantity change for at least one selected row');
      return;
    }

    setSavingAll(true);
    try {
      const updated = await postAdjustments(items);
      toast.success(`${items.length} adjustment${items.length === 1 ? '' : 's'} saved`);
      setModalOpen(false);
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
