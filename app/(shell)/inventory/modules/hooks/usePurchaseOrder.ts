'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { buildMailtoHref, buildPoEmail } from '../utils';
import type { ProductRecord, PurchaseOrderRecord, SupplierOption } from '../types';

type UsePurchaseOrderArgs = {
  product: ProductRecord | null;
  /** Patches the product in place with the server's response — no full-catalogue refetch. */
  onSaved: (product: ProductRecord) => void;
};

export function usePurchaseOrder({ product, onSaved }: UsePurchaseOrderArgs) {
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRecord[]>([]);
  const { request: requestList, loading: loadingList } = useRequest<{ purchaseOrders: PurchaseOrderRecord[] }>();

  const [createOpen, setCreateOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [remark, setRemark] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [skus, setSkus] = useState<Record<string, string>>({});
  const [costs, setCosts] = useState<Record<string, string>>({});
  const { request: requestCreate, loading: saving, errors: createErrors } = useRequest<{ purchaseOrder: PurchaseOrderRecord; product: ProductRecord | null }>();

  const [receiveTarget, setReceiveTarget] = useState<PurchaseOrderRecord | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});
  const [receiveCost, setReceiveCost] = useState<Record<string, string>>({});
  const { request: requestReceive, loading: receiving } = useRequest<{ purchaseOrder: PurchaseOrderRecord; product: ProductRecord | null }>();
  // Bumped after a successful receive — a receipt can create a new (non-primary) supplier link,
  // so the Suppliers tab's Products Count needs to refetch even though this hook has no direct
  // reference to useSuppliers.
  const [receivedNonce, setReceivedNonce] = useState(0);

  const refreshSuppliers = useCallback(() => {
    fetch('/api/inventory/suppliers?pageSize=200')
      .then((res) => res.json())
      .then((json: { success: boolean; data: { suppliers: { id: string; name: string; poEmail: string }[] } }) => {
        if (json.success) setSupplierOptions(json.data.suppliers.map((s) => ({ id: s.id, name: s.name, poEmail: s.poEmail })));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshSuppliers();
  }, [refreshSuppliers]);

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

  /** Resets every create-PO field for `variantIds` (or, given none, every variant on the
   * product) — split out from `openCreate` so the New Product wizard's Purchase order step can
   * seed the same form fields without also flipping on the standalone Create PO modal. */
  const seedForm = (variantIds: string[]) => {
    if (!product) return;
    setSupplierId(supplierOptions[0]?.id ?? '');
    setDeliveryDate('');
    setRemark('');
    setReferenceNumber('');
    const ids = variantIds.length > 0 ? variantIds : product.variants.map((v) => v.id);
    const variantById = new Map(product.variants.map((v) => [v.id, v]));
    setQuantities(Object.fromEntries(ids.map((id) => [id, '1'])));
    setSkus(Object.fromEntries(ids.map((id) => [id, variantById.get(id)?.sku ?? ''])));
    setCosts(Object.fromEntries(ids.map((id) => [id, (variantById.get(id)?.buyPrice ?? 0).toFixed(2)])));
  };

  const openCreate = (variantIds: string[]) => {
    if (!product) return;
    seedForm(variantIds);
    setCreateOpen(true);
  };

  const closeCreate = () => setCreateOpen(false);
  const setQuantity = (variantId: string, value: string) => setQuantities((prev) => ({ ...prev, [variantId]: value }));
  const setSku = (variantId: string, value: string) => setSkus((prev) => ({ ...prev, [variantId]: value }));
  const setCost = (variantId: string, value: string) => setCosts((prev) => ({ ...prev, [variantId]: value }));

  /** `after` fires once the PO is created — used by the New Product wizard to close itself only
   * on a confirmed save. */
  const saveAndSend = (after?: () => void) => {
    if (!product) return;
    const supplier = supplierOptions.find((s) => s.id === supplierId);
    const items = Object.entries(quantities)
      .filter(([, v]) => Number(v) > 0)
      .map(([variantId, v]) => ({
        variantId,
        quantity: Number(v),
        sku: skus[variantId]?.trim() || undefined,
        unitCost: costs[variantId] !== '' && Number.isFinite(Number(costs[variantId])) ? Number(costs[variantId]) : undefined,
      }));

    requestCreate({
      url: '/api/inventory/purchase-orders',
      method: 'POST',
      data: { supplierId, supplierProductId: product.id, referenceNumber: referenceNumber || undefined, deliveryDate: deliveryDate || undefined, remark: remark || undefined, items },
      successMessage: 'Purchase order created',
      validation: async () => {
        const errors: Record<string, string> = {};
        if (!supplierId) errors.supplierId = 'Supplier is required';
        if (items.length === 0) errors.items = 'Enter a quantity of at least 1 for at least one variant';
        return errors;
      },
      onSuccess: ({ data }) => {
        const po = data.purchaseOrder;
        if (supplier) {
          const variantById = new Map(product.variants.map((v) => [v.id, v]));
          const { subject, body } = buildPoEmail({
            number: po.number,
            productTitle: po.productTitle,
            supplierName: supplier.name,
            referenceNumber: po.referenceNumber,
            deliveryDate: po.deliveryDate,
            remark: po.remark,
            items: po.items.map((item) => ({
              quantity: item.quantity,
              variantTitle: item.variantTitle,
              sku: item.sku ?? variantById.get(item.variantId ?? '')?.sku ?? null,
              unitCost: item.unitCost,
            })),
          });
          window.location.href = buildMailtoHref({ to: supplier.poEmail, subject, body });
        }
        setCreateOpen(false);
        loadPurchaseOrders();
        if (data.product) onSaved(data.product);
        after?.();
      },
    });
  };

  const openReceive = (po: PurchaseOrderRecord) => {
    setReceiveTarget(po);
    setReceiveQty(Object.fromEntries(po.items.map((item) => [item.id, String(Math.max(0, item.quantity - item.receivedQuantity))])));
    setReceiveCost(Object.fromEntries(po.items.map((item) => [item.id, item.unitCost !== null ? String(item.unitCost) : ''])));
  };
  const closeReceive = () => setReceiveTarget(null);
  const setReceiveItemQty = (itemId: string, value: string, max?: number) => {
    const clamped = max !== undefined && Number(value) > max ? String(max) : value;
    setReceiveQty((prev) => ({ ...prev, [itemId]: clamped }));
  };
  const setReceiveItemCost = (itemId: string, value: string) => setReceiveCost((prev) => ({ ...prev, [itemId]: value }));

  const submitReceive = () => {
    if (!receiveTarget) return;
    const receipts = Object.entries(receiveQty)
      .filter(([, v]) => Number(v) > 0)
      .map(([itemId, v]) => {
        const costInput = receiveCost[itemId];
        const unitCost = costInput !== undefined && costInput !== '' && Number.isFinite(Number(costInput)) ? Number(costInput) : undefined;
        return { itemId, quantity: Number(v), unitCost };
      });
    if (receipts.length === 0) {
      toast.error('Enter a quantity to receive');
      return;
    }
    requestReceive({
      url: `/api/inventory/purchase-orders/${receiveTarget.id}/receive`,
      method: 'POST',
      data: { receipts },
      successMessage: 'Inventory received',
      onSuccess: ({ data }) => {
        setReceiveTarget(null);
        loadPurchaseOrders();
        if (data.product) onSaved(data.product);
        setReceivedNonce((n) => n + 1);
      },
    });
  };

  return {
    supplierOptions,
    refreshSuppliers,
    purchaseOrders,
    loadingList,
    loadPurchaseOrders,
    createOpen,
    openCreate,
    seedForm,
    closeCreate,
    supplierId,
    setSupplierId,
    deliveryDate,
    setDeliveryDate,
    remark,
    setRemark,
    referenceNumber,
    setReferenceNumber,
    quantities,
    setQuantity,
    skus,
    setSku,
    costs,
    setCost,
    saving,
    createErrors,
    saveAndSend,
    receiveTarget,
    openReceive,
    closeReceive,
    receiveQty,
    setReceiveItemQty,
    receiveCost,
    setReceiveItemCost,
    receiving,
    submitReceive,
    receivedNonce,
  };
}
