'use client';

import { useEffect, useState } from 'react';
import { LOW_STOCK_THRESHOLD } from '../constants';
import type { ApiResponse, LocationOption, ProductDetail, ProductDetailResponse, SiblingProduct } from '../types';

export function useProductDetailData(productId: string) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [siblings, setSiblings] = useState<SiblingProduct[]>([]);
  const [stale, setStale] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(LOW_STOCK_THRESHOLD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/inventory/products/${productId}`);
        const json = (await res.json()) as ApiResponse<ProductDetailResponse>;

        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Failed to load product');
        }
        if (cancelled) return;

        setProduct(json.data.product);
        setLocations(json.data.locations);
        setSiblings(json.data.siblings);
        setStale(json.data.stale);
        setLowStockThreshold(json.data.lowStockThreshold);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load product');
        setProduct(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [productId, refreshToken]);

  const bumpRefresh = () => setRefreshToken((prev) => prev + 1);

  return { product, setProduct, locations, siblings, stale, lowStockThreshold, loading, error, bumpRefresh };
}
