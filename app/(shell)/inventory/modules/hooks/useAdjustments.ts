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
  refreshCatalog: () => void;
};

export function useAdjustments({ product, refreshCatalog }: UseAdjustmentsArgs) {
  const [modalOpen, setModalOpen] = useState(false);
  const [variantIds, setVariantIds] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, AdjustmentRowState>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<StockAdjustmentRecord[]>([]);
  const { request: requestHistory, loading: loadingHistory } = useRequest<{ adjustments: StockAdjustmentRecord[] }>();

  /** Opens the modal for the given variants, or every variant on the product when omitted
   * (the "New adjustment" entry point in Bottom panels vs. the matrix's "Adjust Stock" button). */
  const openModal = (ids?: string[]) => {
    if (!product) return;
    const targetIds = ids && ids.length > 0 ? ids : product.variants.map((v) => v.id);
    setVariantIds(targetIds);
    setRows(Object.fromEntries(targetIds.map((id) => [id, { delta: '', reason: 'CORRECTION' as StockAdjustmentReasonValue, note: '' }])));
    setRowErrors({});
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  const setRowField = (variantId: string, patch: Partial<AdjustmentRowState>) => {
    setRows((prev) => ({ ...prev, [variantId]: { ...prev[variantId], ...patch } }));
    setRowErrors((prev) => {
      if (!(variantId in prev)) return prev;
      const next = { ...prev };
      delete next[variantId];
      return next;
    });
  };

  const applyPreset = (variantId: string, preset: number) => setRowField(variantId, { delta: String(preset) });

  const postAdjustments = async (items: { variantId: string; delta: number; reason: StockAdjustmentReasonValue; note?: string }[]) => {
    const res = await fetch(`/api/inventory/catalog/${product!.id}/adjustments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items.length === 1 ? items[0] : { items }),
    });
    const json = (await res.json()) as { success: boolean; message: string };
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to save adjustment');
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
      await postAdjustments([{ variantId, delta, reason: row.reason, note: row.note || undefined }]);
      toast.success('Stock adjusted');
      setRowField(variantId, { delta: '' });
      refreshCatalog();
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

  /** Saves every row with a non-zero delta in one request; rows left at 0 are skipped. */
  const saveAll = async () => {
    if (!product) return;
    const items = variantIds
      .map((variantId) => ({ variantId, row: rows[variantId] }))
      .filter(({ row }) => row?.delta && Number(row.delta) !== 0)
      .map(({ variantId, row }) => ({ variantId, delta: Number(row.delta), reason: row.reason, note: row.note || undefined }));

    if (items.length === 0) {
      toast.info('Enter a quantity change for at least one row');
      return;
    }

    setSavingAll(true);
    try {
      await postAdjustments(items);
      toast.success(`${items.length} adjustment${items.length === 1 ? '' : 's'} saved`);
      setModalOpen(false);
      refreshCatalog();
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
    rows,
    setRowField,
    applyPreset,
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
