'use client';

import { useEffect, useState } from 'react';
import type { ApiResponse, SupplierRow } from '../types';
import type { PaginationState } from '@/hooks/usePagination';

type UseSuppliersDataArgs = {
  queryString: string;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
};

export function useSuppliersData({ queryString, setPagination }: UseSuppliersDataArgs) {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchSuppliers = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/inventory/suppliers?${queryString}`);
        const json = (await res.json()) as ApiResponse<{ suppliers: SupplierRow[]; pagination: PaginationState }>;

        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Failed to load suppliers');
        }
        if (cancelled) return;

        setSuppliers(json.data.suppliers);
        setPagination(json.data.pagination);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load suppliers');
        setSuppliers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchSuppliers();

    return () => {
      cancelled = true;
    };
  }, [queryString, refreshToken, setPagination]);

  const bumpRefresh = () => setRefreshToken((prev) => prev + 1);

  return { suppliers, setSuppliers, loading, error, bumpRefresh };
}
