'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import type { InventoryGlobals, ProductRecord, ProductsResponse } from '../types';

const EMPTY_GLOBALS: InventoryGlobals = { exchangeRate: 1, marginPercent: 0, baseCurrency: 'AUD', currencies: [{ code: 'AUD', rate: 1 }, { code: 'USD', rate: 1 }] };

export function useCatalogData() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [globals, setGlobals] = useState<InventoryGlobals>(EMPTY_GLOBALS);
  const [rateInput, setRateInput] = useState('');
  const [marginInput, setMarginInput] = useState('');
  const [loaded, setLoaded] = useState(false);
  const { request, loading } = useRequest<ProductsResponse>();
  const { request: requestSettings } = useRequest();

  const load = useCallback(() => {
    request({
      url: '/api/inventory/catalog',
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) => {
        setProducts(data.products);
        setGlobals(data.globals);
        setRateInput(data.globals.exchangeRate.toFixed(2));
        setMarginInput(String(data.globals.marginPercent));
        setLoaded(true);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateProduct = useCallback((productId: string, patch: ProductRecord) => {
    setProducts((prev) => prev.map((p) => (p.id === productId ? patch : p)));
  }, []);

  const addProduct = useCallback((product: ProductRecord) => {
    setProducts((prev) => [product, ...prev]);
  }, []);

  const removeProducts = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setProducts((prev) => prev.filter((p) => !idSet.has(p.id)));
  }, []);

  const patchProducts = useCallback((ids: string[], patch: Partial<ProductRecord>) => {
    const idSet = new Set(ids);
    setProducts((prev) => prev.map((p) => (idSet.has(p.id) ? { ...p, ...patch } : p)));
  }, []);

  const applyGlobalRate = () => {
    const value = Number(rateInput);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter an exchange rate greater than 0');
      return;
    }
    requestSettings({
      url: '/api/inventory/settings',
      method: 'PATCH',
      data: { globalExchangeRate: value },
      successMessage: `System exchange rate set to ${value.toFixed(2)}`,
      onSuccess: () => setGlobals((prev) => ({ ...prev, exchangeRate: value })),
    });
  };

  const applyGlobalMargin = () => {
    const value = Number(marginInput);
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Enter a margin of 0 or more');
      return;
    }
    requestSettings({
      url: '/api/inventory/settings',
      method: 'PATCH',
      data: { globalMarginPercent: value },
      successMessage: `System wide margin set to ${value}%`,
      onSuccess: () => setGlobals((prev) => ({ ...prev, marginPercent: value })),
    });
  };

  return {
    loading,
    /** True only for the page's first load — a background refresh (after a mutation) never
     * flips this, so the detail view and product table stay mounted instead of flashing to
     * skeletons and jumping scroll position. */
    initialLoading: loading && !loaded,
    products,
    globals,
    refresh: load,
    updateProduct,
    addProduct,
    removeProducts,
    patchProducts,
    rateInput,
    setRateInput,
    applyGlobalRate,
    marginInput,
    setMarginInput,
    applyGlobalMargin,
  };
}
