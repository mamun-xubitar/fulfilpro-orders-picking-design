'use client';

import { useState } from 'react';
import useRequest from '@/hooks/useRequest';
import type { ProductRecord, StockAdjustmentRecord, StockAdjustmentReasonValue } from '../types';

const REASONS: StockAdjustmentReasonValue[] = ['DAMAGED', 'LOST', 'FOUND', 'RETURN', 'CORRECTION', 'OTHER'];

type UseAdjustmentsArgs = {
  product: ProductRecord | null;
  refreshCatalog: () => void;
};

export function useAdjustments({ product, refreshCatalog }: UseAdjustmentsArgs) {
  const [modalOpen, setModalOpen] = useState(false);
  const [variantId, setVariantId] = useState('');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState<StockAdjustmentReasonValue>('CORRECTION');
  const [note, setNote] = useState('');
  const { request, loading: saving, errors } = useRequest();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<StockAdjustmentRecord[]>([]);
  const { request: requestHistory, loading: loadingHistory } = useRequest<{ adjustments: StockAdjustmentRecord[] }>();

  const openModal = () => {
    setVariantId(product?.variants[0]?.id ?? '');
    setDelta('');
    setReason('CORRECTION');
    setNote('');
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  const submit = () => {
    if (!product) return;
    request({
      url: `/api/inventory/catalog/${product.id}/adjustments`,
      method: 'POST',
      data: { variantId, delta: Number(delta), reason, note: note || undefined },
      successMessage: 'Stock adjusted',
      validation: async () => {
        const errs: Record<string, string> = {};
        if (!variantId) errs.variantId = 'Select a variant';
        if (!delta || Number(delta) === 0) errs.delta = 'Enter a non-zero quantity';
        return errs;
      },
      onSuccess: () => {
        setModalOpen(false);
        refreshCatalog();
      },
    });
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
    modalOpen,
    openModal,
    closeModal,
    variantId,
    setVariantId,
    delta,
    setDelta,
    reason,
    setReason,
    note,
    setNote,
    saving,
    errors,
    submit,
    historyOpen,
    openHistory,
    closeHistory,
    history,
    loadingHistory,
  };
}
