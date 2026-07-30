'use client';

import { useInventorySettingsData } from './useInventorySettingsData';
import { useMarginSetting } from './useMarginSetting';
import { useLowStockSetting } from './useLowStockSetting';
import { useCurrencyMutations } from './useCurrencyMutations';

export function useInventorySettingsPage() {
  const data = useInventorySettingsData();
  const margin = useMarginSetting({ globalMarginPercent: data.globalMarginPercent, bumpRefresh: data.bumpRefresh });
  const lowStock = useLowStockSetting({ lowStockThreshold: data.lowStockThreshold, bumpRefresh: data.bumpRefresh });
  const mutations = useCurrencyMutations({ bumpRefresh: data.bumpRefresh, setCurrencies: data.setCurrencies });

  return {
    currencies: data.currencies,
    loading: data.loading,
    error: data.error,
    ...margin,
    ...lowStock,
    ...mutations,
  };
}
