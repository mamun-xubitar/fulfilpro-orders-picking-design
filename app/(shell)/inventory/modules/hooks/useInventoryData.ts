'use client';

import { useEffect, useState } from 'react';
import type { ApiResponse, Pagination, ProductRow, StoreOption } from '../types';

type UseInventoryDataArgs = {
  queryString: string;
  setPagination: React.Dispatch<React.SetStateAction<Pagination>>;
};

export function useInventoryData({ queryString, setPagination }: UseInventoryDataArgs) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/inventory/products?${queryString}`);
        const json = (await res.json()) as ApiResponse<{
          products: ProductRow[];
          stores: StoreOption[];
          pagination: Pagination;
        }>;

        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Failed to load products');
        }
        if (cancelled) return;

        setProducts(json.data.products);
        setStores(json.data.stores);
        setPagination(json.data.pagination);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load products');
        setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [queryString, refreshToken, setPagination]);

  const bumpRefresh = () => setRefreshToken((prev) => prev + 1);

  return { products, stores, loading, error, bumpRefresh };
}
