'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import type { InventoryGlobals, ProductRecord, ProductsResponse } from '../types';

const EMPTY_GLOBALS: InventoryGlobals = { exchangeRate: 1, marginPercent: 0, baseCurrency: 'AUD', currencies: [{ code: 'AUD', rate: 1 }] };

export function useCatalogData() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [globals, setGlobals] = useState<InventoryGlobals>(EMPTY_GLOBALS);
  const [rateInput, setRateInput] = useState('');
  const [marginInput, setMarginInput] = useState('');
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
        setRateInput(data.globals.exchangeRate.toFixed(4));
        setMarginInput(String(data.globals.marginPercent));
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
      successMessage: `System exchange rate set to ${value.toFixed(4)}`,
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
    products,
    globals,
    refresh: load,
    updateProduct,
    addProduct,
    rateInput,
    setRateInput,
    applyGlobalRate,
    marginInput,
    setMarginInput,
    applyGlobalMargin,
  };
}
