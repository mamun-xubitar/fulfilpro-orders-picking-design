'use client';

import { useMemo, useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { computeStoreDiff, type StoreDiffResult } from '../storeDiff';
import { buildPublishTarget, defaultStock, emptyDraft, type PublishAspect, type StoreDraft } from '../storeDraft';
import type { ProductRecord, StoreListingResult } from '../types';
import type { StoreListingsState } from './useStoreListings';

type FieldKey = 'title' | 'description' | 'vendor' | 'status' | 'category';

type CategoryValue = { id: string | null; name: string };

type UseStoreDiffArgs = {
  product: ProductRecord;
  listing: StoreListingResult;
  storeListings: StoreListingsState;
};

/** Sets every field the variants table push overlays on top of the live-listing baseline: the
 * table's own SKU/barcode/price edits for each mismatched row, plus (when any row's image
 * disagrees) the whole hub gallery so the row's linked image can go along with it — Shopify
 * requires a variant's assigned file to also be in the product-level files list. Returns the
 * aspects the overlay ended up needing, so the caller can build the payload with the same list.
 * Shared by `saveVariants` and `saveAll` so the two build an identical overlay. */
function overlayVariants(
  draft: StoreDraft,
  product: ProductRecord,
  diff: StoreDiffResult,
  edits: Record<string, string>
): PublishAspect[] {
  const aspects: PublishAspect[] = ['variants'];
  let touchesImages = false;
  let touchesPricing = false;

  for (const v of diff.variants) {
    for (const f of v.fields) {
      const value = edits[`variant:${v.key}:${f.field}`] ?? f.systemValue;
      if (f.field === 'sku') draft.variantSku[v.key] = value;
      else if (f.field === 'barcode') draft.variantBarcode[v.key] = value;
      else if (f.field === 'price') {
        touchesPricing = true;
        draft.variantPrices[v.key] = value;
        if (!draft.variantPricesEdited.includes(v.key)) draft.variantPricesEdited = [...draft.variantPricesEdited, v.key];
      } else if (f.field === 'image') touchesImages = true;
    }
  }

  // Stock and a manual image pick apply to every hub-backed row, not just the ones that already
  // disagreed — an admin can nudge Available or re-assign Image on an otherwise-matching row too.
  const variantImageOverrides = new Map<string, string | null>();
  for (const row of diff.rows) {
    if (!row.hubVariantId) continue;
    const stockEdit = edits[`variant:${row.key}:stock`];
    if (stockEdit !== undefined) draft.variantStock[row.hubVariantId] = stockEdit;

    const imageEdit = edits[`variant:${row.key}:image`];
    if (imageEdit !== undefined) {
      touchesImages = true;
      variantImageOverrides.set(row.hubVariantId, imageEdit || null);
    }
  }

  if (touchesPricing) aspects.push('pricing');
  if (touchesImages) {
    aspects.push('images');
    draft.images = product.images.map((img) => ({ id: img.id, url: img.url, altText: img.altText }));
    draft.excludedImages = [];
    draft.imageAlts = {};
    draft.variantImages = Object.fromEntries(
      product.variants.map((v) => [v.id, variantImageOverrides.has(v.id) ? (variantImageOverrides.get(v.id) ?? null) : (v.imageId ?? null)])
    );
  }

  return aspects;
}

/**
 * Drives the store-differences modal (item 4): computes the diff once (storeDiff.ts, pure and
 * client-only), lets the admin edit each system value inline, then pushes it — one field, the
 * image gallery, or the whole variants table — through the *same* publish endpoint
 * Publish/Bulk update already use, scoped to just the aspects that push needs. A baseline draft
 * seeded from the live listing (emptyDraft) means everything the admin isn't saving right now is
 * resent unchanged. The modal stays open after a save — `storeListings.sync()` refreshes the live
 * listing, the diff recomputes, and whatever was just fixed drops off the list.
 */
export function useStoreDiff({ product, listing, storeListings }: UseStoreDiffArgs) {
  const diff = useMemo(() => computeStoreDiff(product, listing), [product, listing]);

  // Same per-variant Available default the publish modal seeds its own input with — the store's
  // live quantity, or an even split of hub stock for a variant not yet there. Reused here so the
  // differences table's Available input starts at the same number instead of a blank input.
  const stockDefaults = useMemo(
    () => defaultStock(product, listing.storeId, new Set([listing.storeId]), storeListings),
    [product, listing.storeId, storeListings]
  );

  const [edits, setEdits] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of diff.fields) initial[f.key] = f.systemValue;
    for (const v of diff.variants) for (const f of v.fields) initial[`variant:${v.key}:${f.field}`] = f.systemValue;
    return initial;
  });
  const setEdit = (key: string, value: string) => setEdits((prev) => ({ ...prev, [key]: value }));

  const [categoryEdit, setCategoryEdit] = useState<CategoryValue | null>(null);
  const categoryValue: CategoryValue = categoryEdit ?? { id: product.categoryId, name: product.category };

  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const { request } = useRequest<{ results: { storeId: string; status: string; error?: string }[] }>();

  const push = (aspects: PublishAspect[], overlay: (draft: StoreDraft) => void, key: string) => {
    const draft = emptyDraft(product, listing.storeId, storeListings);
    overlay(draft);
    const defaultStockForStore = defaultStock(product, listing.storeId, new Set([listing.storeId]), storeListings);
    const target = buildPublishTarget(product, listing.storeId, draft, aspects, defaultStockForStore);

    setSavingKey(key);
    request({
      url: `/api/inventory/catalog/${product.id}/store-listings/publish`,
      method: 'POST',
      data: { aspects, targets: [target] },
      successMessage: 'Store listing synced',
      onSuccess: () => {
        storeListings.sync();
        setConfirmAction(null);
      },
    }).finally(() => setSavingKey((prev) => (prev === key ? null : prev)));
  };

  const applyFieldOverlay = (draft: StoreDraft, key: FieldKey) => {
    const field = diff.fields.find((f) => f.key === key);
    const value = edits[key] ?? field?.systemValue;
    if (key === 'title' && value !== undefined) draft.title = value;
    else if (key === 'description' && value !== undefined) draft.description = value;
    else if (key === 'vendor' && value !== undefined) draft.vendor = value;
    else if (key === 'status' && value !== undefined) draft.status = value as StoreDraft['status'];
    else if (key === 'category') draft.category = categoryValue;
  };

  const saveField = (key: FieldKey) => push(['details'], (draft) => applyFieldOverlay(draft, key), `field:${key}`);

  const applyImagesOverlay = (draft: StoreDraft) => {
    draft.images = product.images.map((img) => ({ id: img.id, url: img.url, altText: img.altText }));
    draft.excludedImages = [];
    draft.imageAlts = {};
  };

  const saveImages = () => push(['images'], applyImagesOverlay, 'images');

  const saveVariants = () => {
    const aspects = overlayVariants(emptyDraft(product, listing.storeId, storeListings), product, diff, edits);
    setConfirmAction(() => () => push(aspects, (draft) => overlayVariants(draft, product, diff, edits), 'variants'));
  };

  const saveAll = () => {
    const aspects = new Set<PublishAspect>();
    if (diff.fields.length > 0) aspects.add('details');
    if (diff.images) aspects.add('images');

    let variantAspects: PublishAspect[] = [];
    if (diff.variants.length > 0) {
      variantAspects = overlayVariants(emptyDraft(product, listing.storeId, storeListings), product, diff, edits);
      for (const a of variantAspects) aspects.add(a);
    }

    const run = () =>
      push(
        [...aspects],
        (draft) => {
          for (const f of diff.fields) applyFieldOverlay(draft, f.key);
          if (diff.images) applyImagesOverlay(draft);
          if (diff.variants.length > 0) overlayVariants(draft, product, diff, edits);
        },
        'all'
      );

    if (variantAspects.length > 0) setConfirmAction(() => run);
    else run();
  };

  return {
    diff,
    stockDefaults,
    edits,
    setEdit,
    categoryValue,
    setCategory: setCategoryEdit,
    savingKey,
    saveField,
    saveImages,
    saveVariants,
    saveAll,
    confirmOpen: confirmAction !== null,
    confirmSave: () => confirmAction?.(),
    cancelConfirm: () => setConfirmAction(null),
  };
}

export type StoreDiffState = ReturnType<typeof useStoreDiff>;
