'use client';

import { useEffect, useState } from 'react';
import type { ApiResponse, LocationOption, ProductDetail, ProductDetailResponse, SiblingProduct } from '../types';

export function useProductDetailData(productId: string) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [siblings, setSiblings] = useState<SiblingProduct[]>([]);
  const [stale, setStale] = useState(false);
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

  return { product, setProduct, locations, siblings, stale, loading, error, bumpRefresh };
}
