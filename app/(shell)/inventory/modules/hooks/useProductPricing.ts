'use client';

import { useMemo, useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { computePricing, pricingFormToInputs, pricingInputsToForm, round2 } from '../utils';
import type { InventoryGlobals, PricingForm, ProductRecord } from '../types';

const EMPTY_FORM: PricingForm = { currencyCode: 'USD', exchangeRate: '1', buyingPrice: '0', freight: '0', misc: '0', marginPercent: '0', tax: '10' };

type UseProductPricingArgs = {
  product: ProductRecord | null;
  globals: InventoryGlobals;
  onSaved: (product: ProductRecord) => void;
};

export function useProductPricing({ product, globals, onSaved }: UseProductPricingArgs) {
  // Draft and edit mode are tagged with the product they belong to, so changing
  // product discards them without an effect having to reset anything.
  const [draft, setDraft] = useState<{ productId: string; form: PricingForm } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmUse, setConfirmUse] = useState<{ sellingIncTax: number; totalBuying: number } | null>(null);
  const { request: requestSave, loading: saving, errors } = useRequest<ProductRecord>();
  const { request: requestApply, loading: applying } = useRequest<ProductRecord>();

  const saved = product ? pricingInputsToForm(product.pricing) : EMPTY_FORM;
  const form = draft && draft.productId === product?.id ? draft.form : saved;
  const editing = editingId !== null && editingId === product?.id;

  const computed = useMemo(() => computePricing(pricingFormToInputs(form)), [form]);

  const set = (field: keyof PricingForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!product) return;
    const value = e.target.value;
    const next: PricingForm =
      field === 'currencyCode'
        ? { ...form, currencyCode: value, exchangeRate: (globals.currencies.find((c) => c.code === value)?.rate ?? Number(form.exchangeRate)).toFixed(2) }
        : { ...form, [field]: value };
    setDraft({ productId: product.id, form: next });
  };

  const savePricing = () => {
    if (!product) return;
    requestSave({
      url: `/api/inventory/catalog/${product.id}/pricing`,
      method: 'PATCH',
      data: pricingFormToInputs(form) as unknown as Record<string, unknown>,
      successMessage: 'Pricing saved',
      onSuccess: ({ data }) => {
        onSaved(data);
        setDraft(null);
        setEditingId(null);
      },
    });
  };

  const confirmUsePrice = () => {
    if (!confirmUse || !product) return;
    requestApply({
      url: `/api/inventory/catalog/${product.id}/apply-price`,
      method: 'POST',
      data: { sellPrice: round2(confirmUse.sellingIncTax), buyPrice: round2(confirmUse.totalBuying) },
      successMessage: 'Prices applied to every variant',
      onSuccess: ({ data }) => {
        onSaved(data);
        setConfirmUse(null);
      },
    });
  };

  const applyToColours = (colours: string[]) => {
    if (!product) return;
    requestApply({
      url: `/api/inventory/catalog/${product.id}/apply-price`,
      method: 'POST',
      data: { sellPrice: round2(computed.sellingIncTax), buyPrice: round2(computed.totalBuying), colours },
      successMessage: 'Prices applied to the selected colours',
      onSuccess: ({ data }) => onSaved(data),
    });
  };

  return {
    editing,
    saving,
    applying,
    errors,
    form,
    set,
    computed,
    currencies: globals.currencies,
    baseCurrency: globals.baseCurrency,
    startEdit: () => product && setEditingId(product.id),
    cancelEdit: () => {
      setDraft(null);
      setEditingId(null);
    },
    savePricing,
    confirmUse,
    requestUsePrice: () => setConfirmUse({ sellingIncTax: computed.sellingIncTax, totalBuying: computed.totalBuying }),
    cancelUsePrice: () => setConfirmUse(null),
    confirmUsePrice,
    applyToColours,
  };
}
