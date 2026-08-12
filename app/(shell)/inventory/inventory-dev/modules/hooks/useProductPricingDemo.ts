'use client';

import { useMemo, useState } from 'react';
import { computePricing, pricingFormToInputs, pricingInputsToForm, round2 } from '../utils';
import type { InventoryGlobals, PricingForm, ProductRecord } from '../types';

const EMPTY_FORM: PricingForm = { currencyCode: 'AUD', exchangeRate: '1', buyingPrice: '0', freight: '0', misc: '0', marginPercent: '0', tax: '0' };

type UseProductPricingDemoArgs = {
  product: ProductRecord | null;
  globals: InventoryGlobals;
  /** Writes the applied sell/buy price back onto the demo product. */
  applyPrices: (productId: string, sellPrice: number, buyPrice: number) => void;
};

export function useProductPricingDemo({ product, globals, applyPrices }: UseProductPricingDemoArgs) {
  // Draft and edit mode are tagged with the product they belong to, so changing
  // product discards them without an effect having to reset anything.
  const [draft, setDraft] = useState<{ productId: string; form: PricingForm } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmUse, setConfirmUse] = useState<{ sellingIncTax: number; totalBuying: number } | null>(null);

  const saved = product ? pricingInputsToForm(product.pricing) : EMPTY_FORM;
  const form = draft && draft.productId === product?.id ? draft.form : saved;
  const editing = editingId !== null && editingId === product?.id;

  const computed = useMemo(() => computePricing(pricingFormToInputs(form)), [form]);

  const set = (field: keyof PricingForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!product) return;
    const value = e.target.value;
    const next: PricingForm =
      field === 'currencyCode'
        ? { ...form, currencyCode: value, exchangeRate: String(globals.currencies.find((c) => c.code === value)?.rate ?? form.exchangeRate) }
        : { ...form, [field]: value };
    setDraft({ productId: product.id, form: next });
  };

  const taxAmount = Number(form.tax) || 0;

  return {
    editing,
    form,
    set,
    computed,
    taxAmount,
    taxPercentOfSell: computed.sellingPrice > 0 ? (taxAmount / computed.sellingPrice) * 100 : 0,
    currencies: globals.currencies,
    baseCurrency: globals.baseCurrency,
    startEdit: () => product && setEditingId(product.id),
    cancelEdit: () => {
      setDraft(null);
      setEditingId(null);
    },
    savePricing: () => setEditingId(null),
    confirmUse,
    requestUsePrice: () => setConfirmUse({ sellingIncTax: computed.sellingIncTax, totalBuying: computed.totalBuying }),
    cancelUsePrice: () => setConfirmUse(null),
    confirmUsePrice: () => {
      if (!confirmUse || !product) return;
      applyPrices(product.id, round2(confirmUse.sellingIncTax), round2(confirmUse.totalBuying));
      setConfirmUse(null);
    },
  };
}
