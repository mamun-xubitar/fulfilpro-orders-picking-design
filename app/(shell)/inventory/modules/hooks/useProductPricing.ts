'use client';

import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { computePricing, pricingFormToInputs, pricingInputsToForm, round2 } from '../utils';
import type { InventoryGlobals, PricingForm, ProductRecord } from '../types';
import type { StoreListingsState } from './useStoreListings';

const EMPTY_FORM: PricingForm = { currencyCode: 'USD', exchangeRate: '1', buyingPrice: '0', freight: '0', misc: '0', marginPercent: '0', tax: '10' };

type UseProductPricingArgs = {
  product: ProductRecord | null;
  globals: InventoryGlobals;
  storeListings: StoreListingsState;
  onSaved: (product: ProductRecord) => void;
};

export function useProductPricing({ product, globals, storeListings, onSaved }: UseProductPricingArgs) {
  // Draft and edit mode are tagged with the product they belong to, so changing
  // product discards them without an effect having to reset anything.
  const [draft, setDraft] = useState<{ productId: string; form: PricingForm } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmUse, setConfirmUse] = useState<{ sellingIncTax: number; totalBuying: number } | null>(null);
  const { request: requestSave, loading: saving, errors } = useRequest<ProductRecord>();
  const { request: requestApply, loading: applying } = useRequest<ProductRecord>();
  // Per-store margin edits, staged locally until Save — never written on blur/change. Cleared by
  // Cancel and by a successful Save. Seeded from the live listings when edit mode is entered.
  const [marginDraft, setMarginDraftState] = useState<Record<string, number | null> | null>(null);
  const [savingMargins, setSavingMargins] = useState(false);

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
        setEditingId(null);
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
    saving,
    applying,
    errors,
    form,
    set,
    computed,
    currencies: globals.currencies,
    baseCurrency: globals.baseCurrency,
    startEdit: () => {
      if (!product) return;
      setEditingId(product.id);
      setMarginDraftState(Object.fromEntries(storeListings.listings.map((l) => [l.storeId, l.marginPercent])));
    },
    cancelEdit: () => {
      setDraft(null);
      setEditingId(null);
      setMarginDraftState(null);
    },
    savePricing,
    marginDraft: marginDraft ?? {},
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
