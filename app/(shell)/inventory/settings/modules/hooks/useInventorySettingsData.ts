'use client';

import { useEffect, useState } from 'react';
import type { ApiResponse, CurrencyRateRow } from '../types';

export function useInventorySettingsData() {
  const [currencies, setCurrencies] = useState<CurrencyRateRow[]>([]);
  const [globalMarginPercent, setGlobalMarginPercent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchSettings = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/inventory/settings');
        const json = (await res.json()) as ApiResponse<{
          globalMarginPercent: number;
          baseCurrency: string;
          currencies: CurrencyRateRow[];
        }>;

        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Failed to load inventory settings');
        }
        if (cancelled) return;

        setCurrencies(json.data.currencies);
        setGlobalMarginPercent(json.data.globalMarginPercent);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load inventory settings');
        setCurrencies([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchSettings();

    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const bumpRefresh = () => setRefreshToken((prev) => prev + 1);

  return { currencies, setCurrencies, globalMarginPercent, loading, error, bumpRefresh };
}
