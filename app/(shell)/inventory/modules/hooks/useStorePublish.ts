'use client';

import { useState } from 'react';
import useRequest from '@/hooks/useRequest';
import type { PricingInputs, ProductRecord } from '../types';
import type { StoreListingsState } from './useStoreListings';

export type PublishAspect = 'images' | 'details' | 'pricing' | 'variants';

export const ALL_ASPECTS: PublishAspect[] = ['images', 'details', 'pricing', 'variants'];

type PublishResult = { storeId: string; status: 'LISTED' | 'FAILED'; error?: string; url?: string | null };

/** Per-store editable overlay for the publish / bulk-update modals — everything that can differ
 * store to store. Product master fields (name, description, images, variant structure) are
 * always taken from the hub record itself, so there is exactly one place that edits them. */
export type StoreDraft = {
  tags: string;
  seoTitle: string;
  seoDescription: string;
  /** hubVariantId -> ex-tax price for this store. */
  variantPrices: Record<string, string>;
};

function suggestedPrice(pricing: PricingInputs, marginPercent: number | null, fallback: number): number {
  if (marginPercent === null) return fallback;
  // Mirrors computePricing's landed-cost formula, but using this store's own margin instead of
  // the product-level one — never written back into PricingInputs.
  const totalBuying = pricing.buyingPrice * pricing.exchangeRate + pricing.freight + pricing.misc;
  const sellingPrice = totalBuying * (1 + marginPercent / 100);
  return Math.round((sellingPrice + sellingPrice * (pricing.tax / 100)) * 100) / 100;
}

function emptyDraft(product: ProductRecord | null, storeId: string, storeListings: StoreListingsState): StoreDraft {
  const listing = storeListings.listings.find((l) => l.storeId === storeId);
  const margin = listing?.marginPercent ?? null;
  const variantPrices: Record<string, string> = {};
  for (const v of product?.variants ?? []) {
    const existing = listing?.variants.find((sv) => sv.sku && sv.sku === v.sku)?.price;
    const price = existing ?? (product ? suggestedPrice(product.pricing, margin, v.sellPrice) : 0);
    variantPrices[v.id] = String(price);
  }
  return { tags: '', seoTitle: '', seoDescription: '', variantPrices };
}

export function useStorePublish({ product, storeListings }: { product: ProductRecord | null; storeListings: StoreListingsState }) {
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());
  const [publishOpen, setPublishOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkAspects, setBulkAspects] = useState<Set<PublishAspect>>(new Set(['pricing']));
  const [drafts, setDrafts] = useState<Record<string, StoreDraft>>({});
  const { request, loading: publishing } = useRequest<{ results: PublishResult[] }>();

  const toggleStore = (storeId: string) =>
    setSelectedStoreIds((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });

  const toggleAllStores = () => {
    const listed = storeListings.listings.filter((l) => l.found || l.error).map((l) => l.storeId);
    const allSelected = listed.length > 0 && listed.every((id) => selectedStoreIds.has(id));
    setSelectedStoreIds(allSelected ? new Set() : new Set(listed));
  };

  /** Lazily seeds a store's draft (tags/SEO empty, prices suggested from its margin) the first
   * time it's touched, so opening a modal doesn't need an effect to pre-populate every store. */
  const draftFor = (storeId: string): StoreDraft => drafts[storeId] ?? emptyDraft(product, storeId, storeListings);

  const setDraft = (storeId: string, next: StoreDraft) => setDrafts((prev) => ({ ...prev, [storeId]: next }));

  const openPublish = (storeId?: string) => {
    if (storeId) setSelectedStoreIds(new Set([storeId]));
    setDrafts({});
    setPublishOpen(true);
  };

  const openBulkUpdate = () => {
    setBulkAspects(new Set(['pricing']));
    setDrafts({});
    setBulkOpen(true);
  };

  const submit = (storeIds: string[], aspects: PublishAspect[], onDone: (results: PublishResult[]) => void) => {
    if (!product || storeIds.length === 0) return;
    const targets = storeIds.map((storeId) => {
      const draft = draftFor(storeId);
      return {
        storeId,
        tags: draft.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        seoTitle: draft.seoTitle || null,
        seoDescription: draft.seoDescription || null,
        variantPrices: Object.fromEntries(
          Object.entries(draft.variantPrices)
            .map(([id, v]) => [id, Number(v)] as const)
            .filter(([, v]) => Number.isFinite(v) && v >= 0)
        ),
      };
    });

    request({
      url: `/api/inventory/catalog/${product.id}/store-listings/publish`,
      method: 'POST',
      data: { aspects, targets },
      successMessage: 'Store listings updated',
      onSuccess: ({ data }) => {
        onDone(data.results);
        storeListings.sync();
      },
    });
  };

  const publishToSelected = () =>
    submit([...selectedStoreIds], ALL_ASPECTS, () => {
      setPublishOpen(false);
      setSelectedStoreIds(new Set());
    });

  const bulkUpdateSelected = () =>
    submit([...selectedStoreIds], bulkAspects.size > 0 ? [...bulkAspects] : ALL_ASPECTS, () => {
      setBulkOpen(false);
      setSelectedStoreIds(new Set());
    });

  return {
    selectedStoreIds,
    toggleStore,
    toggleAllStores,
    publishOpen,
    openPublish,
    closePublish: () => setPublishOpen(false),
    bulkOpen,
    openBulkUpdate,
    closeBulkUpdate: () => setBulkOpen(false),
    bulkAspects,
    toggleBulkAspect: (aspect: PublishAspect) =>
      setBulkAspects((prev) => {
        const next = new Set(prev);
        if (next.has(aspect)) next.delete(aspect);
        else next.add(aspect);
        return next;
      }),
    draftFor,
    setDraft,
    publishing,
    publishToSelected,
    bulkUpdateSelected,
    /** Closes both modals and clears every draft/selection — called when the admin steps to a
     * different product, since an open draft's variant ids and suggested prices belong to
     * whichever product was on screen when it was seeded. */
    resetForProductChange: () => {
      setSelectedStoreIds(new Set());
      setDrafts({});
      setPublishOpen(false);
      setBulkOpen(false);
    },
  };
}

export type StorePublishState = ReturnType<typeof useStorePublish>;
