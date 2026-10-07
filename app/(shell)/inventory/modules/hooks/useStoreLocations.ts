'use client';

import { useState } from 'react';
import useRequest from '@/hooks/useRequest';

export type StoreLocationRow = {
  id: string;
  storeId: string;
  storeName: string;
  shopifyLocationId: string;
  name: string;
  active: boolean;
  inventoryLocationId: string | null;
};

/** The Store locations modal on the Location tab — maps each connected store's Shopify locations to
 * a hub location, so order fulfilments / returns there move stock at that hub location. */
export function useStoreLocations() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<StoreLocationRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const { request: requestList, loading } = useRequest<{ storeLocations: StoreLocationRow[] }>();
  const { request: requestSync, loading: syncing } = useRequest<{ storeLocations: StoreLocationRow[]; failed: string[] }>();
  const { request: requestSave } = useRequest<null>();

  const sync = () =>
    requestSync({
      url: '/api/inventory/store-locations',
      method: 'POST',
      onSuccess: ({ data }) => setRows(data.storeLocations),
    });

  const openModal = () => {
    setOpen(true);
    requestList({
      url: '/api/inventory/store-locations',
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) => {
        setRows(data.storeLocations);
        setLoaded(true);
        // First use: nothing synced yet — pull the stores' locations straight away.
        if (data.storeLocations.length === 0) sync();
      },
    });
  };

  const setMapping = (row: StoreLocationRow, inventoryLocationId: string | null) => {
    const previous = row.inventoryLocationId;
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, inventoryLocationId } : r)));
    setSavingId(row.id);
    requestSave({
      url: `/api/inventory/store-locations/${row.id}`,
      method: 'PATCH',
      data: { inventoryLocationId },
      successMessage: 'Mapping saved',
      onSuccess: () => setSavingId(null),
      onError: () => {
        setSavingId(null);
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, inventoryLocationId: previous } : r)));
      },
    });
  };

  return {
    open,
    openModal,
    close: () => setOpen(false),
    rows,
    loading: loading || !loaded,
    syncing,
    sync,
    savingId,
    setMapping,
  };
}

export type StoreLocationsState = ReturnType<typeof useStoreLocations>;
