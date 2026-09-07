'use client';

import { useState } from 'react';
import useRequest from '@/hooks/useRequest';
import type { ProductRecord } from '../types';
import type { StoreListingsState } from './useStoreListings';
import { ALL_ASPECTS, buildPublishTarget, defaultStock, emptyDraft, isPublished, resolveStock } from '../storeDraft';
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

  /** Lazily seeds a store's draft from the hub product (prices suggested from its margin) the
   * first time it's touched, so opening a modal doesn't need an effect to pre-populate. */
  const draftFor = (storeId: string): StoreDraft => drafts[storeId] ?? emptyDraft(product, storeId, storeListings);

  const setDraft = (storeId: string, next: StoreDraft) => setDrafts((prev) => ({ ...prev, [storeId]: next }));

  // Opposite lifecycle to `draftFor`: recomputed on every call, never stored, because the default
  // split depends on which stores are currently selected — it would go stale the moment the
  // selection changes if it were baked into a draft the way variantPrices is.
  const defaultStockFor = (storeId: string) => defaultStock(product, storeId, selectedStoreIds, storeListings);

  // Rows where the unpublished selected stores' resolved stock for a variant sums past the hub's
  // own available quantity — informational only, so a deliberate overcommit reads as intentional
  // rather than a mistake. Scoped to unpublished stores: a published store's live Shopify quantity
  // routinely exceeds hub availability in normal trading, which would make this fire permanently
  // if included (this also means it's always empty in the bulk-update modal, where every store is
  // published).
  const stockWarnings = (product?.variants ?? []).flatMap((v) => {
    const peers = storeListings.listings.filter((l) => selectedStoreIds.has(l.storeId) && !isPublished(l));
    if (peers.length === 0) return [];
    const total = peers.reduce((sum, l) => sum + resolveStock(draftFor(l.storeId), v.id, defaultStockFor(l.storeId)), 0);
    const available = Math.max(0, v.stockOnHand - v.allocated);
    return total > available ? [{ variantId: v.id, colour: v.colour, size: v.size, total, available }] : [];
  });

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
      buildPublishTarget(product, storeId, draftFor(storeId), aspects, defaultStockFor(storeId))
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
    stockWarnings,
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
