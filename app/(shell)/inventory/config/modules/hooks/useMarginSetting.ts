'use client';

import { useEffect, useState } from 'react';
import useRequest from '@/hooks/useRequest';

type MarginSettingParams = {
  globalMarginPercent: number;
  bumpRefresh: () => void;
};

export function useMarginSetting({ globalMarginPercent, bumpRefresh }: MarginSettingParams) {
  const { request, loading, errors } = useRequest<{ globalMarginPercent: number }>();
  const [marginInput, setMarginInput] = useState(String(globalMarginPercent));

  useEffect(() => {
    setMarginInput(String(globalMarginPercent));
  }, [globalMarginPercent]);

  function saveMargin() {
    void request({
      url: '/api/inventory/settings',
      method: 'PATCH',
      data: { globalMarginPercent: Number(marginInput) },
      successMessage: 'Margin saved',
      validation: async () => {
        const errs: Record<string, string> = {};
        const trimmed = marginInput.trim();
        const value = Number(trimmed);
        if (!trimmed || Number.isNaN(value)) errs.globalMarginPercent = 'Enter a valid number';
        else if (value < 0 || value > 100) errs.globalMarginPercent = 'Margin must be between 0 and 100';
        return errs;
      },
      onSuccess: bumpRefresh,
    });
  }

  return { marginInput, setMarginInput, savingMargin: loading, marginErrors: errors, saveMargin };
}
