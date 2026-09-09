'use client';

import { useEffect, useRef, useState } from 'react';
import useRequest from '@/hooks/useRequest';

/** Debounced inline "is this itemNo taken" check — used by the New Product wizard's Basics step
 * and by Product details' itemNo field, so a collision is flagged before submit instead of only
 * surfacing as the create/save 409. `excludeId` (the product currently being edited) lets an
 * in-place edit check against every other product without tripping on its own itemNo. */
export function useItemNoAvailability(itemNo: string, excludeId?: string) {
  const [taken, setTaken] = useState(false);
  const { request, loading: checking } = useRequest<{ available: boolean }>();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = itemNo.trim();
    // Both branches' setState calls run inside the timeout callback (0ms for the empty-input
    // reset, 300ms for the debounced check) rather than synchronously in the effect body itself —
    // avoids the cascading-render footgun the effect-linter flags for a direct setState call here.
    debounceRef.current = setTimeout(
      () => {
        if (!trimmed) {
          setTaken(false);
          return;
        }
        request({
          url: '/api/inventory/catalog/item-no',
          method: 'GET',
          showToast: false,
          data: { itemNo: trimmed, ...(excludeId ? { excludeId } : {}) },
          onSuccess: ({ data }) => setTaken(!data.available),
        });
      },
      trimmed ? 300 : 0
    );
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemNo, excludeId]);

  return { taken, checking };
}
