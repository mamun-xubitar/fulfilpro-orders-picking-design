'use client';

import { useEffect, useState } from 'react';
import useRequest from '@/hooks/useRequest';

export type InventoryCategoryOption = { id: string; name: string };

type ListResponse = { categories: InventoryCategoryOption[] };
type CreateResponse = { category: InventoryCategoryOption };

/** The flat hub-only Category library (HubCategoryPicker) — loaded once page-wide, same pattern
 * as useOptionLibrary. Distinct from the Shopify taxonomy CategoryPicker fetches live per
 * keystroke; this one is small enough to hold in full and filter client-side. */
export function useInventoryCategories() {
  const [categories, setCategories] = useState<InventoryCategoryOption[]>([]);
  const { request: requestList, loading } = useRequest<ListResponse>();
  const { request: requestCreate, loading: creating } = useRequest<CreateResponse>();

  const load = () => {
    requestList({
      url: '/api/inventory/categories',
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) => setCategories(data.categories),
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  /** Idempotent against an existing case-insensitive match — the server returns that row instead
   * of erroring, so the picker's Add button can always call this and select whatever comes back.
   * The name is stored with its first letter uppercased. */
  const create = (rawName: string): Promise<InventoryCategoryOption | null> =>
    new Promise((resolve) => {
      const name = rawName.trim().replace(/^./, (ch) => ch.toUpperCase());
      requestCreate({
        url: '/api/inventory/categories',
        method: 'POST',
        data: { name },
        showToast: false,
        onSuccess: ({ data }) => {
          setCategories((prev) => (prev.some((c) => c.id === data.category.id) ? prev : [...prev, data.category].sort((a, b) => a.name.localeCompare(b.name))));
          resolve(data.category);
        },
        onError: () => resolve(null),
      });
    });

  return { categories, loading, creating, create };
}

export type InventoryCategoriesState = ReturnType<typeof useInventoryCategories>;
