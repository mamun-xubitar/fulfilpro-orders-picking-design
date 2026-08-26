'use client';

import { useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { buildCountSheetDocument } from '../utils';
import type { ProductRecord, StocktakeRecord } from '../types';

type UseStocktakeArgs = {
  product: ProductRecord | null;
  refreshCatalog: () => void;
};

export function useStocktake({ product, refreshCatalog }: UseStocktakeArgs) {
  const [active, setActive] = useState<StocktakeRecord | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const { request: requestStart, loading: starting } = useRequest<StocktakeRecord>();
  const { request: requestComplete, loading: completing } = useRequest<{ stocktake: StocktakeRecord; product: ProductRecord }>();

  const start = () => {
    if (!product) return;
    requestStart({
      url: `/api/inventory/catalog/${product.id}/stocktakes`,
      method: 'POST',
      successMessage: 'Stocktake started',
      onSuccess: ({ data }) => {
        setActive(data);
        setCounts(Object.fromEntries(data.items.map((i) => [i.id, String(i.countedQty ?? i.expectedQty)])));
      },
    });
  };

  const close = () => setActive(null);
  const setCount = (itemId: string, value: string) => setCounts((prev) => ({ ...prev, [itemId]: value }));

  const complete = () => {
    if (!active) return;
    const items = active.items.map((i) => ({ itemId: i.id, countedQty: Number(counts[i.id] ?? i.expectedQty) }));
    requestComplete({
      url: `/api/inventory/catalog/${product?.id}/stocktakes/${active.id}`,
      method: 'PATCH',
      data: { items },
      successMessage: 'Stocktake completed',
      onSuccess: () => {
        setActive(null);
        refreshCatalog();
      },
    });
  };

  const printCountSheet = () => {
    if (!product) return;
    const items = product.variants.map((v) => ({ colour: v.colour, size: v.size, sku: v.sku, expectedQty: v.stockOnHand }));
    const doc = buildCountSheetDocument(product, items);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(doc);
    win.document.close();
    win.focus();
    win.print();
  };

  return { active, starting, start, close, counts, setCount, completing, complete, printCountSheet };
}
