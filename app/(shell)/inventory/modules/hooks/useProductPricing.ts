'use client';

import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { resolveStoreMargin } from '@/lib/inventory/store-price';
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
  // Per-store margin edits, staged locally until Save — never written on blur/change. Cleared by
  // a successful Save. `null` means "untouched" — no explicit "start edit" moment exists anymore
  // to seed it at, so it's resolved lazily below (`effectiveMarginDraft`) from whatever the live
  // listings currently say instead.
  const [marginDraft, setMarginDraftState] = useState<Record<string, number | null> | null>(null);
  const [savingMargins, setSavingMargins] = useState(false);

  const saved = product ? pricingInputsToForm(product.pricing) : EMPTY_FORM;
  const form = draft && draft.productId === product?.id ? draft.form : saved;
  // The panel is always editable — `editing` now just means "there's a product loaded to edit".
  const editing = product !== null;

  const computed = useMemo(() => computePricing(pricingFormToInputs(form)), [form]);

  // What the per-store margin rows actually display: any explicit edit, falling back to each
  // store's resolved margin (its own product-specific margin, or that store's global default)
  // for a store that hasn't been touched yet.
  const effectiveMarginDraft = useMemo(
    () => ({
      ...Object.fromEntries(storeListings.listings.map((l) => [l.storeId, resolveStoreMargin(l.marginPercent, l.storeDefaultMarginPercent)])),
      ...(marginDraft ?? {}),
    }),
    [storeListings.listings, marginDraft]
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

  /** Which staged margin entries actually differ from what's live — unchanged stores are never
   * re-PATCHed (and so never repriced on Shopify) just because the panel was saved. */
  const changedMargins = (): [string, number | null][] => {
    if (!marginDraft) return [];
    return Object.entries(marginDraft).filter(([storeId, value]) => {
      const live = storeListings.listings.find((l) => l.storeId === storeId)?.marginPercent ?? null;
      return live !== value;
    });
  };

  /** `after` fires once every part of the save succeeds — used by the New Product wizard to
   * advance to the next step only on a confirmed save. */
  const savePricing = (after?: () => void) => {
    if (!product) return;
    const toApply = changedMargins();
    requestSave({
      url: `/api/inventory/catalog/${product.id}/pricing`,
      method: 'PATCH',
      data: pricingFormToInputs(form) as unknown as Record<string, unknown>,
      // Suppress the default toast when store margins are also changing, so the admin sees one
      // combined summary instead of "Pricing saved" immediately followed by a second toast.
      successMessage: toApply.length > 0 ? () => null : 'Pricing saved',
      onSuccess: async ({ data }) => {
        onSaved(data);
        if (toApply.length > 0) {
          setSavingMargins(true);
          await Promise.all(toApply.map(([storeId, value]) => storeListings.setMargin(storeId, value, { silent: true })));
          setSavingMargins(false);
          toast.success(`Pricing saved · ${toApply.length} store margin${toApply.length === 1 ? '' : 's'} updated`);
        }
        setDraft(null);
        setMarginDraftState(null);
        after?.();
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
    dirty: !pricingFormsEqual(form, saved) || changedMargins().length > 0,
    saving,
    applying,
    errors,
    form,
    set,
    computed,
    currencies: globals.currencies,
    baseCurrency: globals.baseCurrency,
    /** Discards the in-progress draft — the panel itself no longer has a Cancel button (always
     * editable, Save-only), but the New Product wizard's "Skip" still uses this to back out of
     * step 4 without saving. */
    cancelEdit: () => {
      setDraft(null);
      setMarginDraftState(null);
    },
    savePricing,
    marginDraft: effectiveMarginDraft,
    savingMargins,
    setPendingMargin: (storeId: string, marginPercent: number | null) =>
      setMarginDraftState((prev) => ({ ...(prev ?? {}), [storeId]: marginPercent })),
    confirmUse,
    requestUsePrice: () => setConfirmUse({ sellingIncTax: computed.sellingIncTax, totalBuying: computed.totalBuying }),
    cancelUsePrice: () => setConfirmUse(null),
    confirmUsePrice,
    applyToColours,
  };
}
