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

/** Seeded onto every new PO's Shipping Remark field. `{orderNumber}` is a literal token the
 * server substitutes with this PO's own display number ("PO-00074") once it's created — see
 * PurchaseOrderModel.create. */
const DEFAULT_SHIPPING_REMARK = 'NF.{orderNumber}, color: , size: , quantity: , made in china.';

/** The locations the PO's lines are kept at, deduped, A→Z — what the Receive modal's Location dropdown offers. */
export function receiveLocationOptions(items: PurchaseOrderRecord['items']): { id: string; name: string }[] {
  const byId = new Map<string, string>();
  for (const item of items) for (const l of item.locations) byId.set(l.id, l.name);
  return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

export function usePurchaseOrder({ product, onSaved }: UsePurchaseOrderArgs) {
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRecord[]>([]);
  const { request: requestList, loading: loadingList } = useRequest<{ purchaseOrders: PurchaseOrderRecord[] }>();

  const [createOpen, setCreateOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [poRemark, setPoRemark] = useState('');
  const [shippingRemark, setShippingRemark] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [skus, setSkus] = useState<Record<string, string>>({});
  const [costs, setCosts] = useState<Record<string, string>>({});
  const { request: requestCreate, loading: saving, errors: createErrors } = useRequest<{ purchaseOrder: PurchaseOrderRecord; product: ProductRecord | null }>();

  const [receiveTarget, setReceiveTarget] = useState<PurchaseOrderRecord | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});
  const [receiveCost, setReceiveCost] = useState<Record<string, string>>({});
  /** The one location the receipt is put away at. Lines whose variant isn't kept there fall back to
   * their own first location; lines with no location receive into unassigned stock. */
  const [receiveLocationId, setReceiveLocationId] = useState('');
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
    setPoRemark('');
    setShippingRemark(DEFAULT_SHIPPING_REMARK);
    setReferenceNumber('');
    const ids = variantIds.length > 0 ? variantIds : product.variants.map((v) => v.id);
    const variantById = new Map(product.variants.map((v) => [v.id, v]));
    // Buying price (converted to AUD) — not the landed total (which also folds in freight/misc)
    // and not the variant's own weighted-average received cost.
    const seedCost = (product.pricing.buyingPrice * product.pricing.exchangeRate).toFixed(2);
    setQuantities(Object.fromEntries(ids.map((id) => [id, String(product.poQuantity)])));
    setSkus(Object.fromEntries(ids.map((id) => [id, variantById.get(id)?.sku ?? ''])));
    setCosts(Object.fromEntries(ids.map((id) => [id, seedCost])));
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
  /** Bulk column fill for the create-PO items table's Qty header (item 8) — writes every row
   * currently in the form, not just the ones the caller happens to know about. */
  const setAllQuantities = (value: number) => setQuantities((prev) => Object.fromEntries(Object.keys(prev).map((id) => [id, String(value)])));

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
      data: {
        supplierId,
        supplierProductId: product.id,
        referenceNumber: referenceNumber || undefined,
        deliveryDate: deliveryDate || undefined,
        poRemark: poRemark || undefined,
        shippingRemark: shippingRemark || undefined,
        items,
      },
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
          // The server-resolved copy — {orderNumber} has already been substituted with this PO's
          // own display number by the time it comes back.
          const { subject, body } = buildPoEmail({
            number: po.number,
            productTitle: po.productTitle,
            supplierName: supplier.name,
            referenceNumber: po.referenceNumber,
            deliveryDate: po.deliveryDate,
            poRemark: po.poRemark,
            shippingRemark: po.shippingRemark,
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
    setReceiveLocationId(receiveLocationOptions(po.items)[0]?.id ?? '');
  };
  const closeReceive = () => setReceiveTarget(null);
  const getReceiveQtyError = (value: string | undefined, remaining: number): string | null => {
    if (value === undefined || value.trim() === '') return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 'Enter a valid number';
    if (parsed < 0) return 'Cannot be negative';
    if (!Number.isInteger(parsed)) return 'Must be a whole number';
    if (parsed > remaining) return `Max ${remaining}`;
    return null;
  };
  const setReceiveItemQty = (itemId: string, value: string, _max?: number) => {
    setReceiveQty((prev) => ({ ...prev, [itemId]: value }));
  };
  const setReceiveItemCost = (itemId: string, value: string) => setReceiveCost((prev) => ({ ...prev, [itemId]: value }));
  /** Bulk column fill for the Receive PO modal's Receive qty header (item 8) — each row still
   * clamps to its own remaining (quantity - receivedQuantity), same as a per-row edit. */
  const setAllReceiveQty = (value: number) => {
    if (!receiveTarget) return;
    setReceiveQty(
      Object.fromEntries(
        receiveTarget.items.map((item) => {
          const remaining = Math.max(0, item.quantity - item.receivedQuantity);
          return [item.id, String(Math.min(value, remaining))];
        })
      )
    );
  };

  const submitReceive = () => {
    if (!receiveTarget) return;
    for (const item of receiveTarget.items) {
      const remaining = Math.max(0, item.quantity - item.receivedQuantity);
      const err = getReceiveQtyError(receiveQty[item.id], remaining);
      if (err) {
        toast.error(`${item.variantTitle}: ${err}`);
        return;
      }
    }
    const receipts = Object.entries(receiveQty)
      .filter(([, v]) => Number(v) > 0)
      .map(([itemId, v]) => {
        const costInput = receiveCost[itemId];
        const unitCost = costInput !== undefined && costInput !== '' && Number.isFinite(Number(costInput)) ? Number(costInput) : undefined;
        const itemLocations = receiveTarget.items.find((item) => item.id === itemId)?.locations ?? [];
        const locationId = itemLocations.some((l) => l.id === receiveLocationId) ? receiveLocationId : itemLocations[0]?.id;
        return { itemId, quantity: Number(v), unitCost, locationId };
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
        // Keep the modal open on the updated PO so its received/remaining figures are current;
        // quantities re-seed to the new remaining, cost and location stay as entered.
        const po = data.purchaseOrder;
        setReceiveTarget(po);
        setReceiveQty(Object.fromEntries(po.items.map((item) => [item.id, String(Math.max(0, item.quantity - item.receivedQuantity))])));
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
    poRemark,
    setPoRemark,
    shippingRemark,
    setShippingRemark,
    referenceNumber,
    setReferenceNumber,
    quantities,
    setQuantity,
    setAllQuantities,
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
    getReceiveQtyError,
    setAllReceiveQty,
    receiveCost,
    setReceiveItemCost,
    receiveLocationId,
    setReceiveLocationId,
    receiveLocationOptions: receiveTarget ? receiveLocationOptions(receiveTarget.items) : [],
    receiving,
    submitReceive,
    receivedNonce,
  };
}
