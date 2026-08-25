'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { buildMailtoHref, buildPoEmail } from '../utils';
import type { ProductRecord, PurchaseOrderRecord, SupplierOption } from '../types';

type UsePurchaseOrderArgs = {
  product: ProductRecord | null;
  refreshCatalog: () => void;
};

export function usePurchaseOrder({ product, refreshCatalog }: UsePurchaseOrderArgs) {
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRecord[]>([]);
  const { request: requestList, loading: loadingList } = useRequest<{ purchaseOrders: PurchaseOrderRecord[] }>();

  const [createOpen, setCreateOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [remark, setRemark] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const { request: requestCreate, loading: saving, errors: createErrors } = useRequest<PurchaseOrderRecord>();

  const [receiveTarget, setReceiveTarget] = useState<PurchaseOrderRecord | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});
  const { request: requestReceive, loading: receiving } = useRequest<PurchaseOrderRecord>();

  useEffect(() => {
    fetch('/api/inventory/suppliers?pageSize=200')
      .then((res) => res.json())
      .then((json: { success: boolean; data: { suppliers: { id: string; name: string; poEmail: string }[] } }) => {
        if (json.success) setSupplierOptions(json.data.suppliers.map((s) => ({ id: s.id, name: s.name, poEmail: s.poEmail })));
      })
      .catch(() => {});
  }, []);

  const loadPurchaseOrders = () => {
    if (!product) return;
    requestList({
      url: '/api/inventory/purchase-orders',
      method: 'GET',
      showToast: false,
      data: { supplierProductId: product.id, pageSize: 50 },
      onSuccess: ({ data }) => setPurchaseOrders(data.purchaseOrders),
    });
  };

  useEffect(() => {
    loadPurchaseOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const openCreate = (variantIds: string[]) => {
    if (!product) return;
    setSupplierId(supplierOptions[0]?.id ?? '');
    setDeliveryDate('');
    setRemark('');
    const ids = variantIds.length > 0 ? variantIds : product.variants.map((v) => v.id);
    setQuantities(Object.fromEntries(ids.map((id) => [id, '1'])));
    setCreateOpen(true);
  };

  const closeCreate = () => setCreateOpen(false);
  const setQuantity = (variantId: string, value: string) => setQuantities((prev) => ({ ...prev, [variantId]: value }));

  const saveAndSend = () => {
    if (!product) return;
    const supplier = supplierOptions.find((s) => s.id === supplierId);
    const items = Object.entries(quantities)
      .filter(([, v]) => Number(v) > 0)
      .map(([variantId, v]) => ({ variantId, quantity: Number(v) }));

    requestCreate({
      url: '/api/inventory/purchase-orders',
      method: 'POST',
      data: { supplierId, supplierProductId: product.id, deliveryDate: deliveryDate || undefined, remark: remark || undefined, items },
      successMessage: 'Purchase order created',
      validation: async () => {
        const errors: Record<string, string> = {};
        if (!supplierId) errors.supplierId = 'Supplier is required';
        if (items.length === 0) errors.items = 'Enter a quantity of at least 1 for at least one variant';
        return errors;
      },
      onSuccess: ({ data: po }) => {
        if (supplier) {
          const variantById = new Map(product.variants.map((v) => [v.id, v]));
          const { subject, body } = buildPoEmail({
            number: po.number,
            productTitle: po.productTitle,
            supplierName: supplier.name,
            deliveryDate: po.deliveryDate,
            remark: po.remark,
            items: po.items.map((item) => ({ quantity: item.quantity, variantTitle: item.variantTitle, sku: item.sku ?? variantById.get(item.variantId ?? '')?.sku ?? null })),
          });
          window.location.href = buildMailtoHref({ to: supplier.poEmail, subject, body });
        }
        setCreateOpen(false);
        loadPurchaseOrders();
      },
    });
  };

  const openReceive = (po: PurchaseOrderRecord) => {
    setReceiveTarget(po);
    setReceiveQty(Object.fromEntries(po.items.map((item) => [item.id, String(Math.max(0, item.quantity - item.receivedQuantity))])));
  };
  const closeReceive = () => setReceiveTarget(null);
  const setReceiveItemQty = (itemId: string, value: string, max?: number) => {
    const clamped = max !== undefined && Number(value) > max ? String(max) : value;
    setReceiveQty((prev) => ({ ...prev, [itemId]: clamped }));
  };

  const submitReceive = () => {
    if (!receiveTarget) return;
    const receipts = Object.entries(receiveQty)
      .filter(([, v]) => Number(v) > 0)
      .map(([itemId, v]) => ({ itemId, quantity: Number(v) }));
    if (receipts.length === 0) {
      toast.error('Enter a quantity to receive');
      return;
    }
    requestReceive({
      url: `/api/inventory/purchase-orders/${receiveTarget.id}/receive`,
      method: 'POST',
      data: { receipts },
      successMessage: 'Inventory received',
      onSuccess: () => {
        setReceiveTarget(null);
        loadPurchaseOrders();
        refreshCatalog();
      },
    });
  };

  return {
    supplierOptions,
    purchaseOrders,
    loadingList,
    createOpen,
    openCreate,
    closeCreate,
    supplierId,
    setSupplierId,
    deliveryDate,
    setDeliveryDate,
    remark,
    setRemark,
    quantities,
    setQuantity,
    saving,
    createErrors,
    saveAndSend,
    receiveTarget,
    openReceive,
    closeReceive,
    receiveQty,
    setReceiveItemQty,
    receiving,
    submitReceive,
  };
}
