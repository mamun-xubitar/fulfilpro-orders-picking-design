'use client';

import { useMemo, useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { computePricing, pricingFormToInputs, pricingInputsToForm, round2 } from '../utils';
import type { InventoryGlobals, PricingForm, ProductRecord } from '../types';
import type { StoreListingsState } from './useStoreListings';

const EMPTY_FORM: PricingForm = { currencyCode: 'USD', exchangeRate: '1', buyingPrice: '0', freight: '0', misc: '0', marginPercent: '0', tax: '10' };

/** Value equality for the dirty check below — every PricingForm field is a string, so a flat
 * per-field compare is enough (mirrors useProductDetails' formsEqual). */
function pricingFormsEqual(a: PricingForm, b: PricingForm): boolean {
  return (
    a.currencyCode === b.currencyCode &&
    a.exchangeRate === b.exchangeRate &&
    a.buyingPrice === b.buyingPrice &&
    a.freight === b.freight &&
    a.misc === b.misc &&
    a.marginPercent === b.marginPercent &&
    a.tax === b.tax
  );
}

type UseProductPricingArgs = {
  product: ProductRecord | null;
  globals: InventoryGlobals;
  storeListings: StoreListingsState;
  onSaved: (product: ProductRecord) => void;
};

export function useProductPricing({ product, globals, storeListings, onSaved }: UseProductPricingArgs) {
  // Draft is tagged with the product it belongs to, so changing product discards it without an
  // effect having to reset anything.
  const [draft, setDraft] = useState<{ productId: string; form: PricingForm } | null>(null);
  const [confirmUse, setConfirmUse] = useState<{ sellingIncTax: number; totalBuying: number } | null>(null);
  const { request: requestSave, loading: saving, errors } = useRequest<ProductRecord>();
  const { request: requestApply, loading: applying } = useRequest<ProductRecord>();
  const [savingMargin, setSavingMargin] = useState(false);

  const saved = product ? pricingInputsToForm(product.pricing) : EMPTY_FORM;
  const form = draft && draft.productId === product?.id ? draft.form : saved;
  // The panel is always editable — `editing` now just means "there's a product loaded to edit".
  const editing = product !== null;

  const computed = useMemo(() => computePricing(pricingFormToInputs(form)), [form]);

  // What the per-store margin modals reflect: only a product-specific override (this product's
  // own saved margin for that store) — a store that merely inherits its global default is not
  // included until explicitly added. Per-store margin now saves directly (saveStoreMargin) rather
  // than being staged alongside the pricing form, so this reads straight off the live listings.
  const storeMargins = useMemo(
    () => Object.fromEntries(storeListings.listings.filter((l) => l.marginPercent !== null).map((l) => [l.storeId, l.marginPercent])),
    [storeListings.listings]
  );

  const set = (field: keyof PricingForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!product) return;
    const value = e.target.value;
    const next: PricingForm =
      field === 'currencyCode'
        ? { ...form, currencyCode: value, exchangeRate: (globals.currencies.find((c) => c.code === value)?.rate ?? Number(form.exchangeRate)).toFixed(2) }
        : { ...form, [field]: value };
    setDraft({ productId: product.id, form: next });
  };

  /** `after` fires once the save succeeds — used by the New Product wizard to advance to the
   * next step only on a confirmed save. Per-store margins are no longer part of this save — they
   * persist directly from the Per store margin modal via `saveStoreMargin`. */
  const savePricing = (after?: () => void) => {
    if (!product) return;
    requestSave({
      url: `/api/inventory/catalog/${product.id}/pricing`,
      method: 'PATCH',
      data: pricingFormToInputs(form) as unknown as Record<string, unknown>,
      successMessage: 'Pricing saved',
      onSuccess: ({ data }) => {
        onSaved(data);
        setDraft(null);
        after?.();
      },
    });
  };

  /** Persists one store's per-store margin immediately — called from the Per store margin
   * modal's own Apply, independent of the panel's pricing Save. `null` clears the override. */
  const saveStoreMargin = async (storeId: string, marginPercent: number | null, after?: () => void): Promise<{ ok: boolean; error?: string }> => {
    setSavingMargin(true);
    const result = await storeListings.setMargin(storeId, marginPercent);
    setSavingMargin(false);
    if (result.ok) after?.();
    return result;
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
    dirty: !pricingFormsEqual(form, saved),
    saving,
    applying,
    errors,
    form,
    /** The last-saved pricing form — the per-store margin modals price-preview off this rather
     * than the unsaved draft, since the server reprices from saved pricing. */
    savedForm: saved,
    set,
    computed,
    currencies: globals.currencies,
    baseCurrency: globals.baseCurrency,
    /** Discards the in-progress draft — the panel itself no longer has a Cancel button (always
     * editable, Save-only), but the New Product wizard's "Skip" still uses this to back out of
     * step 4 without saving. */
    cancelEdit: () => setDraft(null),
    savePricing,
    storeMargins,
    savingMargin,
    saveStoreMargin,
    confirmUse,
    requestUsePrice: () => setConfirmUse({ sellingIncTax: computed.sellingIncTax, totalBuying: computed.totalBuying }),
    cancelUsePrice: () => setConfirmUse(null),
    confirmUsePrice,
    applyToColours,
  };
}
