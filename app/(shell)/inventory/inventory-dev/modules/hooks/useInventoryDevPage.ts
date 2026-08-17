'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { fetchDemoProducts } from '../demo-data';
import { summariseVariants } from '../utils';
import { useProductDetailsDemo } from './useProductDetailsDemo';
import { useProductImages } from './useProductImages';
import { useProductNavigation } from './useProductNavigation';
import { useProductPricingDemo } from './useProductPricingDemo';
import { useVariantsMatrix } from './useVariantsMatrix';
import type { InventoryGlobals, ModuleTabId, ProductRecord, ProductTabId, StoreListing, VariantRow } from '../types';

const EMPTY_GLOBALS: InventoryGlobals = { exchangeRate: 1, marginPercent: 0, baseCurrency: 'AUD', currencies: [{ code: 'AUD', rate: 1 }] };

export function useInventoryDevPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [globals, setGlobals] = useState<InventoryGlobals>(EMPTY_GLOBALS);
  /** Captured once on load so relative timestamps stay stable across renders. */
  const [now, setNow] = useState(0);
  const [moduleTab, setModuleTab] = useState<ModuleTabId>('products');
  const [productTab, setProductTab] = useState<ProductTabId>('details');
  const [rateInput, setRateInput] = useState('');
  const [marginInput, setMarginInput] = useState('');
  const [storedEdits, setStoredEdits] = useState<{ productId: string; values: Record<string, Partial<VariantRow>> } | null>(null);
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [editImagesOpen, setEditImagesOpen] = useState(false);
  const [storePriceTarget, setStorePriceTarget] = useState<StoreListing | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchDemoProducts().then((res) => {
      if (cancelled) return;
      setProducts(res.products);
      setGlobals(res.globals);
      setRateInput(res.globals.exchangeRate.toFixed(4));
      setMarginInput(String(res.globals.marginPercent));
      setNow(Date.now());
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Every stubbed button lands here — nothing is persisted in demo mode. */
  const notImplemented = useCallback((action: string) => {
    toast.info(`${action} is not wired up yet — this screen runs on demo data.`);
  }, []);

  const updateProduct = useCallback((productId: string, patch: (p: ProductRecord) => ProductRecord) => {
    setProducts((prev) => prev.map((p) => (p.id === productId ? patch(p) : p)));
  }, []);

  const applyPrices = useCallback(
    (productId: string, sellPrice: number, buyPrice: number) => {
      updateProduct(productId, (p) => ({ ...p, variants: p.variants.map((v) => ({ ...v, sellPrice, buyPrice })) }));
      toast.success('Prices applied to every variant');
    },
    [updateProduct]
  );

  const nav = useProductNavigation(products);
  const product = nav.product;

  // Row edits are tagged with their product, so they fall away on navigation.
  // Memoised so the empty case keeps a stable identity for downstream memos.
  const variantEdits = useMemo(
    () => (storedEdits && storedEdits.productId === product?.id ? storedEdits.values : {}),
    [storedEdits, product?.id]
  );

  const setVariantEdit = useCallback(
    (variantId: string, patch: Partial<VariantRow>) => {
      if (!product) return;
      setStoredEdits((prev) => {
        const base = prev && prev.productId === product.id ? prev.values : {};
        return { productId: product.id, values: { ...base, [variantId]: { ...base[variantId], ...patch } } };
      });
    },
    [product]
  );

  /** Drops one row's unsaved edits — the matrix row Cancel. */
  const clearVariantEdit = useCallback(
    (variantId: string) => {
      if (!product) return;
      setStoredEdits((prev) => {
        if (!prev || prev.productId !== product.id) return prev;
        const rest = { ...prev.values };
        delete rest[variantId];
        return { productId: product.id, values: rest };
      });
    },
    [product]
  );

  const gallery = useProductImages(product);
  const pricing = useProductPricingDemo({ product, globals, applyPrices });
  const details = useProductDetailsDemo(product);
  const matrix = useVariantsMatrix({
    product,
    sizes: details.sizes,
    colours: details.colours,
    variantEdits,
    setVariantEdit,
    clearVariantEdit,
  });

  /** Stock Summary always reflects the whole product, not the filtered rows. */
  const summary = useMemo(() => {
    if (!product) return summariseVariants([]);
    return summariseVariants(product.variants.map((v) => (v.id in variantEdits ? { ...v, ...variantEdits[v.id] } : v)));
  }, [product, variantEdits]);

  const applyGlobalRate = () => {
    const value = Number(rateInput);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter an exchange rate greater than 0');
      return;
    }
    setGlobals((prev) => ({ ...prev, exchangeRate: value }));
    toast.success(`System exchange rate set to ${value.toFixed(4)}`);
  };

  const applyGlobalMargin = () => {
    const value = Number(marginInput);
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Enter a margin of 0 or more');
      return;
    }
    setGlobals((prev) => ({ ...prev, marginPercent: value }));
    toast.success(`System wide margin set to ${value}%`);
  };

  const saveStorePrice = (storeId: string, price: number) => {
    if (!product) return;
    updateProduct(product.id, (p) => ({ ...p, stores: p.stores.map((s) => (s.id === storeId ? { ...s, price } : s)) }));
    setStorePriceTarget(null);
    toast.success('Store price updated');
  };

  return {
    loading,
    product,
    globals,
    now,
    moduleTab,
    setModuleTab,
    productTab,
    setProductTab,
    nav,
    gallery,
    pricing,
    details,
    matrix,
    summary,
    rateInput,
    setRateInput,
    applyGlobalRate,
    marginInput,
    setMarginInput,
    applyGlobalMargin,
    notImplemented,
    newProductOpen,
    openNewProduct: () => setNewProductOpen(true),
    closeNewProduct: () => setNewProductOpen(false),
    editImagesOpen,
    openEditImages: () => setEditImagesOpen(true),
    closeEditImages: () => setEditImagesOpen(false),
    storePriceTarget,
    setStorePriceTarget,
    saveStorePrice,
  };
}

export type InventoryDevPage = ReturnType<typeof useInventoryDevPage>;
