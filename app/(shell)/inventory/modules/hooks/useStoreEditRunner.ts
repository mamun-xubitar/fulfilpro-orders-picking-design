'use client';

import { toast } from 'react-toastify';
import type { ProductRecord, StoreListingResult } from '../types';
import type { StoreListingsState } from './useStoreListings';

export type StoreEditRequest = {
  /** Route under `.../store-listings/{storeId}/` — product | media | variants. */
  path: 'product' | 'media' | 'variants';
  method: 'POST' | 'PATCH' | 'DELETE';
  json?: Record<string, unknown>;
  /** Multipart body, used when a new image file is being uploaded. */
  form?: FormData;
};

type Envelope = { success?: boolean; message?: string; errors?: string[] };

type Args = {
  product: ProductRecord;
  listing: StoreListingResult;
  storeListings: StoreListingsState;
  setSavingKey: React.Dispatch<React.SetStateAction<string | null>>;
};

/**
 * Sends one direct store edit (a single field, image or variant change — see
 * StoreListingEditController) and, on success, refreshes the live listing so the differences modal
 * recomputes. `key` names what's in flight in `savingKey`, so the matching button can show its own
 * spinner while the rest of the modal stays usable except for "Save all". Resolves to whether it
 * succeeded; failures toast their own message.
 */
export function useStoreEditRunner({ product, listing, storeListings, setSavingKey }: Args) {
  const run = async (key: string, req: StoreEditRequest, successMessage: string): Promise<boolean> => {
    if (!listing.productGid) {
      toast.error('This product is not on the store yet');
      return false;
    }
    setSavingKey(key);
    try {
      const url = `/api/inventory/catalog/${product.id}/store-listings/${listing.storeId}/${req.path}`;
      let init: RequestInit;
      if (req.form) {
        req.form.set('productGid', listing.productGid);
        init = { method: req.method, body: req.form };
      } else {
        init = { method: req.method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productGid: listing.productGid, ...req.json }) };
      }
      const res = await fetch(url, init);
      const json = (await res.json().catch(() => null)) as Envelope | null;
      if (!res.ok || !json?.success) throw new Error(json?.errors?.length ? json.errors.join('; ') : (json?.message ?? 'Request failed'));
      toast.success(successMessage);
      await storeListings.syncQuiet();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Request failed');
      return false;
    } finally {
      setSavingKey((prev) => (prev === key ? null : prev));
    }
  };

  return { run };
}

export type StoreEditRunner = ReturnType<typeof useStoreEditRunner>['run'];
