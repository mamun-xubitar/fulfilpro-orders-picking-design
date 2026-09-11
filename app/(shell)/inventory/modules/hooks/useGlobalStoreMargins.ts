'use client';

import { useEffect, useState } from 'react';
import useRequest from '@/hooks/useRequest';

export type GlobalStoreMarginRow = { storeId: string; storeName: string; marginPercent: number | null };

/**
 * The "Per store margin" control on the inventory toolbar — a global fallback margin per
 * connected store, used when a product has no product-specific per-store margin of its own (see
 * the resolution chain in lib/inventory/store-price.ts). Opened as a modal: `draft` only ever
 * holds stores the user has explicitly added in this session (seeded from stores that already
 * have a saved non-null margin via `openModal`), edited locally, and committed in one batch by
 * `save()` — nothing is written to the server until Save.
 */
export function useGlobalStoreMargins() {
  const [stores, setStores] = useState<GlobalStoreMarginRow[]>([]);
  const [draft, setDraft] = useState<Record<string, number | null>>({});
  const [saving, setSaving] = useState(false);
  const { request: requestList, loading } = useRequest<{ stores: GlobalStoreMarginRow[] }>();
  const { request: requestSave } = useRequest<{ storeId: string; marginPercent: number | null }>();

  const load = () => {
    requestList({
      url: '/api/inventory/settings/store-margins',
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) => setStores(data.stores),
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  /** Called when the modal opens — reseeds the staged list from only the stores that already have
   * a saved margin, never from every connected store. */
  const openModal = () => {
    setDraft(Object.fromEntries(stores.filter((s) => s.marginPercent !== null).map((s) => [s.storeId, s.marginPercent as number])));
  };

  const discard = () => setDraft({});

  const addStore = (storeId: string) => setDraft((prev) => ({ ...prev, [storeId]: 0 }));

  const removeStore = (storeId: string) =>
    setDraft((prev) => {
      const next = { ...prev };
      delete next[storeId];
      return next;
    });

  const setValue = (storeId: string, marginPercent: number) => setDraft((prev) => ({ ...prev, [storeId]: marginPercent }));

  const available = stores.filter((s) => !(s.storeId in draft));

  const save = async () => {
    const dirty = stores
      .map((s) => ({ storeId: s.storeId, marginPercent: s.storeId in draft ? draft[s.storeId] : null, persisted: s.marginPercent }))
      .filter((row) => row.marginPercent !== row.persisted);
    if (dirty.length === 0) return;

    setSaving(true);
    for (const { storeId, marginPercent } of dirty) {
      await requestSave({
        url: '/api/inventory/settings/store-margins',
        method: 'PATCH',
        data: { storeId, marginPercent },
        successMessage: marginPercent === null ? 'Store margin removed' : `Store margin set to ${marginPercent}%`,
        onSuccess: ({ data }) => {
          setStores((prev) => prev.map((s) => (s.storeId === data.storeId ? { ...s, marginPercent: data.marginPercent } : s)));
        },
      });
    }
    setSaving(false);
  };

  return { stores, loading, draft, available, openModal, addStore, removeStore, setValue, discard, save, saving };
}

export type GlobalStoreMarginsState = ReturnType<typeof useGlobalStoreMargins>;
