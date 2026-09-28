'use client';

import { useState } from 'react';
import useRequest from '@/hooks/useRequest';
import type { ProductRecord } from '../types';
import type { StoreListingsState } from './useStoreListings';
import { ALL_ASPECTS, buildPublishTarget, defaultStock, emptyDraft, isPublished } from '../storeDraft';
import type { PublishAspect, StoreDraft } from '../storeDraft';

export type { PublishAspect, StoreDraft };
export { ALL_ASPECTS };

type PublishResult = { storeId: string; status: 'LISTED' | 'FAILED'; error?: string; url?: string | null };

export function useStorePublish({ product, storeListings }: { product: ProductRecord | null; storeListings: StoreListingsState }) {
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());
  const [publishOpen, setPublishOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkAspects, setBulkAspects] = useState<Set<PublishAspect>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, StoreDraft>>({});
  const { request, loading: publishing } = useRequest<{ results: PublishResult[] }>();

  const toggleStore = (storeId: string) =>
    setSelectedStoreIds((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });

  /** Selects/clears every store in `ids` (default: every connected store) — the Bulk update modal
   * passes only published stores so "select all" there never picks up an unpublished one. */
  const toggleAllStores = (ids?: string[]) => {
    const all = ids ?? storeListings.listings.map((l) => l.storeId);
    const allSelected = all.length > 0 && all.every((id) => selectedStoreIds.has(id));
    setSelectedStoreIds(allSelected ? new Set() : new Set(all));
  };

  // Publish always seeds from the system (hub) product — even for a store that's already
  // published there — so re-publishing genuinely re-pushes the hub's current state. Bulk update
  // seeds from that store's own live listing, since it edits the published product in place. The
  // two modals are mutually exclusive (see openPublish/openBulkUpdate) and each clears `drafts` on
  // open, so a draft can never be read under the wrong source.
  const draftSource = bulkOpen ? 'listing' : 'hub';

  /** Lazily seeds a store's draft (prices suggested from its margin) the first time it's touched,
   * so opening a modal doesn't need an effect to pre-populate. */
  const draftFor = (storeId: string): StoreDraft => drafts[storeId] ?? emptyDraft(product, storeId, storeListings, draftSource);

  const setDraft = (storeId: string, next: StoreDraft) => setDrafts((prev) => ({ ...prev, [storeId]: next }));

  // Every store's Available defaults to the hub's own pool (one shared stock pool, so every store
  // shows/pushes the same number) — no per-selection split, so this no longer depends on which
  // store it's for.
  const defaultStockFor = () => defaultStock(product);

  // A store whose draft excludes every hub variant has nothing for `productSet` to push — Shopify
  // would otherwise fabricate its own zero-price, untracked default variant (the same case is
  // rejected server-side in lib/shopify-product-publish.server.ts). A hub product with zero
  // variants isn't this guard's concern — there's nothing to have excluded.
  const hasNoVariantsIncluded = (storeId: string) => {
    const variantIds = product?.variants.map((v) => v.id) ?? [];
    if (variantIds.length === 0) return false;
    const excluded = draftFor(storeId).excludedVariants;
    return variantIds.every((id) => excluded.includes(id));
  };

  // Publish and bulk-update are mutually exclusive — each open* closes the other so their store
  // blocks (and any open picker dropdowns inside them) can never render stacked on top of each
  // other at once.
  const openPublish = (storeId?: string) => {
    if (storeId) setSelectedStoreIds(new Set([storeId]));
    setDrafts({});
    setBulkOpen(false);
    setPublishOpen(true);
  };

  // Narrows to published stores on open — a selection made in the Publish modal (which can
  // select an unfound store) must never carry an unpublished store into the bulk-update count.
  const openBulkUpdate = () => {
    setSelectedStoreIds((prev) => new Set([...prev].filter((id) => isPublished(storeListings.listings.find((l) => l.storeId === id)))));
    setBulkAspects(new Set());
    setDrafts({});
    setPublishOpen(false);
    setBulkOpen(true);
  };

  const submit = (storeIds: string[], aspects: PublishAspect[], onDone: (results: PublishResult[]) => void) => {
    if (!product || storeIds.length === 0) return;
    const targets = storeIds.map((storeId) =>
      buildPublishTarget(product, storeId, draftFor(storeId), aspects, defaultStockFor())
    );

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

  const bulkUpdateSelected = () => {
    // Bulk update only ever targets the published product — a store checked on the panel before
    // it was published has nothing to submit here even if it was left selected.
    const publishableIds = [...selectedStoreIds].filter((id) => isPublished(storeListings.listings.find((l) => l.storeId === id)));
    submit(publishableIds, bulkAspects.size > 0 ? [...bulkAspects] : ALL_ASPECTS, () => {
      setBulkOpen(false);
      setSelectedStoreIds(new Set());
    });
  };

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
    defaultStockFor,
    hasNoVariantsIncluded,
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
