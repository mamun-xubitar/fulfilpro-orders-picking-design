'use client';

import { useEffect, useState } from 'react';
import useRequest from '@/hooks/useRequest';

export type BillingStore = {
  id: string;
  name: string;
  storeDomain: string;
  ausTaxRate: number;
  nzTaxRate: number;
  defaultTerms: string | null;
};

/** The stores the current user may bill from, with each store's invoice defaults. */
export function useStoreOptions(enabled = true) {
  const [stores, setStores] = useState<BillingStore[]>([]);
  const { request } = useRequest<{ stores: BillingStore[] }>();

  useEffect(() => {
    if (!enabled) return;
    void request({
      url: '/api/invoices/stores',
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) => setStores(data.stores),
    });
  }, [request, enabled]);

  return stores;
}
