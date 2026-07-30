'use client';

import { useEffect, useRef, useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { computePricing, firstVariantCost } from '../utils';
import { EMPTY_PRICING_FORM } from '../types';
import type { ApiResponse, CurrencyOption, PricingForm, ProductDetail, ProductPricingResponse } from '../types';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type UseProductPricingArgs = {
  productId: string;
  product: ProductDetail | null;
  bumpRefresh: () => void;
};

export function useProductPricing({ productId, product, bumpRefresh }: UseProductPricingArgs) {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PricingForm>(EMPTY_PRICING_FORM);
  const [currencyOptions, setCurrencyOptions] = useState<CurrencyOption[]>([{ code: 'AUD', rate: 1 }]);
  const [confirmTarget, setConfirmTarget] = useState<{ sellingIncTax: number; totalBuying: number } | null>(null);
  const [hasSavedPricing, setHasSavedPricing] = useState(false);
  const seededFromCostRef = useRef(false);
  const { request: saveRequest, loading: saving, errors } = useRequest();
  const { request: applyRequest, loading: applying } = useRequest();

  useEffect(() => {
    let cancelled = false;
    seededFromCostRef.current = false;

    const fetchPricing = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/inventory/products/${productId}/pricing`);
        const json = (await res.json()) as ApiResponse<ProductPricingResponse>;
        if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load pricing');
        if (cancelled) return;

        const options: CurrencyOption[] = [{ code: 'AUD', rate: 1 }, ...json.data.currencies.map((c) => ({ code: c.code, rate: c.rate }))];
        setCurrencyOptions(options);

        const { pricing } = json.data;
        setHasSavedPricing(Boolean(pricing));
        setForm(
          pricing
            ? {
                currencyCode: pricing.currencyCode,
                exchangeRate: String(pricing.exchangeRate),
                buyingPrice: String(pricing.buyingPrice),
                freight: String(pricing.freight),
                misc: String(pricing.misc),
                marginPercent: String(pricing.marginPercent),
                tax: String(pricing.tax),
              }
            : { ...EMPTY_PRICING_FORM, marginPercent: String(json.data.globalMarginPercent) }
        );
      } catch {
        if (!cancelled) setForm(EMPTY_PRICING_FORM);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchPricing();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    if (loading || hasSavedPricing || seededFromCostRef.current || !product) return;
    const cost = firstVariantCost(product.variants);
    if (cost == null) return;
    seededFromCostRef.current = true;
    setForm((prev) => ({ ...prev, buyingPrice: String(cost) }));
  }, [loading, hasSavedPricing, product]);

  const set = (field: keyof PricingForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    if (field === 'currencyCode') {
      const option = currencyOptions.find((c) => c.code === value);
      setForm((prev) => ({ ...prev, currencyCode: value, exchangeRate: option ? String(option.rate) : prev.exchangeRate }));
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const computed = computePricing({
    buyingPrice: Number(form.buyingPrice) || 0,
    freight: Number(form.freight) || 0,
    misc: Number(form.misc) || 0,
    exchangeRate: Number(form.exchangeRate) || 0,
    marginPercent: Number(form.marginPercent) || 0,
    tax: Number(form.tax) || 0,
  });

  const startEdit = () => setEditing(true);
  const cancelEdit = () => setEditing(false);

  const savePricing = () => {
    saveRequest({
      url: `/api/inventory/products/${productId}/pricing`,
      method: 'PATCH',
      data: {
        currencyCode: form.currencyCode,
        exchangeRate: Number(form.exchangeRate),
        buyingPrice: Number(form.buyingPrice),
        freight: Number(form.freight),
        misc: Number(form.misc),
        marginPercent: Number(form.marginPercent),
        tax: Number(form.tax),
      },
      successMessage: 'Pricing saved',
      validation: async () => {
        const validationErrors: Record<string, string> = {};
        if (!/^[A-Z]{3}$/.test(form.currencyCode)) validationErrors.currencyCode = 'Select a currency';
        if (!Number.isFinite(Number(form.exchangeRate)) || Number(form.exchangeRate) <= 0) validationErrors.exchangeRate = 'Enter a rate greater than 0';
        if (!Number.isFinite(Number(form.buyingPrice)) || Number(form.buyingPrice) < 0) validationErrors.buyingPrice = 'Enter a value of 0 or more';
        if (!Number.isFinite(Number(form.freight)) || Number(form.freight) < 0) validationErrors.freight = 'Enter a value of 0 or more';
        if (!Number.isFinite(Number(form.misc)) || Number(form.misc) < 0) validationErrors.misc = 'Enter a value of 0 or more';
        const margin = Number(form.marginPercent);
        if (!Number.isFinite(margin) || margin < 0 || margin > 100) validationErrors.marginPercent = 'Margin must be between 0 and 100';
        if (!Number.isFinite(Number(form.tax)) || Number(form.tax) < 0) validationErrors.tax = 'Enter a value of 0 or more';
        return validationErrors;
      },
      onSuccess: () => {
        setEditing(false);
        setHasSavedPricing(true);
      },
    });
  };

  const requestUsePrice = () => setConfirmTarget({ sellingIncTax: computed.sellingIncTax, totalBuying: computed.totalBuying });
  const cancelUsePrice = () => setConfirmTarget(null);
  const confirmUsePrice = () => {
    if (!confirmTarget || !product) return;
    applyRequest({
      url: `/api/inventory/products/${productId}/variants`,
      method: 'PATCH',
      data: {
        variants: product.variants.map((v) => ({ id: v.id, price: round2(confirmTarget.sellingIncTax), cost: round2(confirmTarget.totalBuying) })),
      } as unknown as Record<string, unknown>,
      successMessage: 'Prices applied',
      onSuccess: () => {
        bumpRefresh();
        setConfirmTarget(null);
      },
    });
  };

  return {
    loading,
    saving,
    applying,
    editing,
    form,
    set,
    errors,
    currencyOptions,
    computed,
    startEdit,
    cancelEdit,
    savePricing,
    confirmTarget,
    requestUsePrice,
    cancelUsePrice,
    confirmUsePrice,
  };
}
