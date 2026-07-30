'use client';

import { useEffect, useState } from 'react';
import useRequest from '@/hooks/useRequest';

type LowStockSettingParams = {
  lowStockThreshold: number;
  bumpRefresh: () => void;
};

export function useLowStockSetting({ lowStockThreshold, bumpRefresh }: LowStockSettingParams) {
  const { request, loading, errors } = useRequest<{ lowStockThreshold: number }>();
  const [lowStockInput, setLowStockInput] = useState(String(lowStockThreshold));

  useEffect(() => {
    setLowStockInput(String(lowStockThreshold));
  }, [lowStockThreshold]);

  function saveLowStock() {
    void request({
      url: '/api/inventory/settings',
      method: 'PATCH',
      data: { lowStockThreshold: Number(lowStockInput) },
      successMessage: 'Low stock threshold saved',
      validation: async () => {
        const errs: Record<string, string> = {};
        const trimmed = lowStockInput.trim();
        const value = Number(trimmed);
        if (!trimmed || Number.isNaN(value)) errs.lowStockThreshold = 'Enter a valid number';
        else if (!Number.isInteger(value) || value < 0) errs.lowStockThreshold = 'Must be 0 or a whole number';
        return errs;
      },
      onSuccess: bumpRefresh,
    });
  }

  return { lowStockInput, setLowStockInput, savingLowStock: loading, lowStockErrors: errors, saveLowStock };
}
