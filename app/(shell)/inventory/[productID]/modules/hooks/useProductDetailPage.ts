'use client';

import { useEffect, useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { useProductDetailData } from './useProductDetailData';
import { useFieldEdit } from './useFieldEdit';
import { useProductVariants } from './useProductVariants';
import { useVariantSelection } from './useVariantSelection';
import { useStockAdjust } from './useStockAdjust';
import { useStoreSiblings } from './useStoreSiblings';
import { useProductSuppliers } from './useProductSuppliers';
import { usePurchaseOrders } from './usePurchaseOrders';
import { useProductPricing } from './useProductPricing';

export function useProductDetailPage(productID: string) {
  const data = useProductDetailData(productID);
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const toggleDetailsExpanded = () => setDetailsExpanded((prev) => !prev);
  const pricing = useProductPricing({ productId: productID, product: data.product, bumpRefresh: data.bumpRefresh });
  const fieldEdit = useFieldEdit({ product: data.product, bumpRefresh: data.bumpRefresh });
  const variantsView = useProductVariants(data.product);
  const selection = useVariantSelection({ productId: productID, bumpRefresh: data.bumpRefresh });
  const stockAdjust = useStockAdjust({ productId: productID, locations: data.locations, bumpRefresh: data.bumpRefresh });
  const siblingsPanel = useStoreSiblings({ bumpRefresh: data.bumpRefresh });
  const productSuppliers = useProductSuppliers({ productId: productID, bumpRefresh: data.bumpRefresh });
  const purchaseOrders = usePurchaseOrders({ productId: productID, product: data.product, locations: data.locations, bumpRefresh: data.bumpRefresh });
  const { request: requestContinueToggle, loading: togglingContinue } = useRequest();
  const { retainOnly } = selection;

  useEffect(() => {
    retainOnly(new Set(variantsView.filteredVariants.map((v) => v.id)));
  }, [variantsView.filteredVariants, retainOnly]);

  const allContinueSelling = !!data.product && data.product.variants.length > 0 && data.product.variants.every((v) => v.inventoryPolicy === 'CONTINUE');

  const toggleAllContinueSelling = () => {
    if (!data.product) return;
    const nextPolicy = allContinueSelling ? 'DENY' : 'CONTINUE';
    requestContinueToggle({
      url: `/api/inventory/products/${productID}/variants`,
      method: 'PATCH',
      data: { variants: data.product.variants.map((v) => ({ id: v.id, inventoryPolicy: nextPolicy })) } as unknown as Record<string, unknown>,
      successMessage: 'Continue selling updated',
      onSuccess: () => data.bumpRefresh(),
    });
  };

  return {
    productId: productID,
    ...data,
    fieldEdit,
    ...variantsView,
    selection,
    stockAdjust,
    siblingsPanel,
    productSuppliers,
    purchaseOrders,
    allContinueSelling,
    toggleAllContinueSelling,
    togglingContinue,
    detailsExpanded,
    toggleDetailsExpanded,
    pricing,
  };
}
