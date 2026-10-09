'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import type { AdjustmentBatchDetail } from '../types';

/** The "View adjustment" modal: loads one adjustment with its lines. Owned by the page so the
 * Adjustments tab, a product's history list and the History tab all open the same modal. */
export function useAdjustmentDetail() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<AdjustmentBatchDetail | null>(null);
  const { request, loading } = useRequest<AdjustmentBatchDetail>();

  const openAdjustment = (id: string) => {
    setDetail(null);
    setOpen(true);
    request({
      url: `/api/inventory/adjustments/${id}`,
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) => setDetail(data),
      onError: (err) => {
        toast.error(err.general ?? 'Unable to load this adjustment');
        setOpen(false);
      },
    });
  };

  return { open, detail, loading, openAdjustment, close: () => setOpen(false) };
}

export type AdjustmentDetailState = ReturnType<typeof useAdjustmentDetail>;
