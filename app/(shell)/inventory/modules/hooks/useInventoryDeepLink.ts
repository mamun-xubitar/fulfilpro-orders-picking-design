'use client';

import { useEffect, useRef } from 'react';
import type { ProductRecord } from '../types';

type Args = {
  product: ProductRecord | null | undefined;
  openProduct: (id: string) => void;
  openCreatePo: (variantIds: string[], quantity?: number) => void;
};

/** `/inventory?product=<id>&createPo=<variantId>&qty=<n>` (the Orders page's "+ PO" button): focus that
 * product, then open the standard Create PO form for the variant once the product has loaded. */
export function useInventoryDeepLink({ product, openProduct, openCreatePo }: Args) {
  const pending = useRef<{ productId: string; variantId: string; quantity?: number } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product');
    const variantId = params.get('createPo');
    if (!productId || !variantId) return;
    const qty = Number.parseInt(params.get('qty') ?? '', 10);
    pending.current = { productId, variantId, quantity: Number.isFinite(qty) && qty > 0 ? qty : undefined };
    window.history.replaceState(null, '', window.location.pathname);
    openProduct(productId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const target = pending.current;
    if (!target || product?.id !== target.productId) return;
    pending.current = null;
    openCreatePo([target.variantId], target.quantity);
  }, [product, openCreatePo]);
}
