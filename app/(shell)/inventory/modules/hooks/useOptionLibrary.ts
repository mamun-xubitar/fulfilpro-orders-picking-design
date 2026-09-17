'use client';

import { useEffect, useState } from 'react';
import useRequest from '@/hooks/useRequest';

export type GlobalOption = { id: string; name: string };

type LibraryResponse = { colours: GlobalOption[]; sizes: GlobalOption[] };

/** The flat global colour/size library backing the Colour & size adjustment modal — loaded once
 * page-wide, shared by every entry point (Product details, Variants toolbar, New Product wizard).
 * Replaces the old preset-group system (useInventoryPresets). */
export function useOptionLibrary() {
  const [colours, setColours] = useState<GlobalOption[]>([]);
  const [sizes, setSizes] = useState<GlobalOption[]>([]);
  const { request: requestList, loading } = useRequest<LibraryResponse>();
  const { request: requestSave, loading: saving } = useRequest<LibraryResponse>();
  const { request: requestDelete } = useRequest<null>();

  const load = () => {
    requestList({
      url: '/api/inventory/option-library',
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) => {
        setColours(data.colours);
        setSizes(data.sizes);
      },
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  /** Adds every name in `names` to the matching library that isn't already there
   * (case-insensitive) — safe to call even when nothing is new. Resolves with the library's full,
   * fresh list of that kind (not just what changed), so a caller can match its own items against
   * it without depending on this hook's own state having re-rendered yet. */
  const saveNames = (kind: 'colour' | 'size', names: string[]): Promise<GlobalOption[] | null> =>
    new Promise((resolve) => {
      if (names.length === 0) return resolve(kind === 'colour' ? colours : sizes);
      requestSave({
        url: '/api/inventory/option-library',
        method: 'POST',
        data: { kind, names },
        successMessage: kind === 'colour' ? 'Colours saved to library' : 'Sizes saved to library',
        onSuccess: ({ data }) => {
          // The save endpoint only returns the saved kind's list (`{ colours }` or `{ sizes }`,
          // never both) — only update that one's state, or the other kind's state would be
          // overwritten with undefined.
          if (kind === 'colour') setColours(data.colours);
          else setSizes(data.sizes);
          resolve(kind === 'colour' ? data.colours : data.sizes);
        },
        onError: () => resolve(null),
      });
    });

  const deleteItem = (kind: 'colour' | 'size', id: string): Promise<boolean> =>
    new Promise((resolve) => {
      requestDelete({
        url: `/api/inventory/option-library/${kind}/${id}`,
        method: 'DELETE',
        successMessage: kind === 'colour' ? 'Colour removed from library' : 'Size removed from library',
        onSuccess: () => {
          if (kind === 'colour') setColours((prev) => prev.filter((c) => c.id !== id));
          else setSizes((prev) => prev.filter((s) => s.id !== id));
          resolve(true);
        },
        onError: () => resolve(false),
      });
    });

  return { colours, sizes, loading, saving, saveNames, deleteItem };
}

export type OptionLibraryState = ReturnType<typeof useOptionLibrary>;
