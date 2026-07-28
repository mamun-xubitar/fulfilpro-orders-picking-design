'use client';

import { useEffect, useState } from 'react';
import useRequest from '@/hooks/useRequest';
import type { ApiResponse, SupplierOption } from '../types';

type UseProductSuppliersArgs = {
  productId: string;
  bumpRefresh: () => void;
};

export function useProductSuppliers({ productId, bumpRefresh }: UseProductSuppliersArgs) {
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const { request, loading: savingSupplier } = useRequest();

  useEffect(() => {
    fetch('/api/inventory/products/form-data')
      .then((res) => res.json())
      .then((json: ApiResponse<{ suppliers: SupplierOption[] }>) => {
        if (json.success) setSupplierOptions(json.data.suppliers);
      })
      .catch(() => {});
  }, []);

  const selectSupplier = (supplierId: string) => {
    if (!supplierId) return;
    void request({
      url: `/api/inventory/suppliers/${supplierId}/connections`,
      method: 'POST',
      data: { type: 'product', productId },
      successMessage: 'Supplier connected',
      onSuccess: () => bumpRefresh(),
    });
  };

  return { supplierOptions, savingSupplier, selectSupplier };
}
