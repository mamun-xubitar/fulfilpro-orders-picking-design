import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type {
  AddLineItemModalState,
  ApiResponse,
  DeleteLineItemModalState,
  EditLineItemModalState,
  OrderItem,
  OrderRow,
  VariantSearchResult,
} from '../types';
import { getApiErrorMessage, getFulfilledQty } from '../utils';

type UseLineItemEditingArgs = {
  setOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>;
  blockTestModeAction: () => boolean;
  userIsAdmin: boolean;
  resetOrderSelections: (orderId: string) => void;
};

export function useLineItemEditing({ setOrders, blockTestModeAction, userIsAdmin, resetOrderSelections }: UseLineItemEditingArgs) {
  const [deleteLineItemModal, setDeleteLineItemModal] = useState<DeleteLineItemModalState | null>(null);
  const [editLineItemModal, setEditLineItemModal] = useState<EditLineItemModalState | null>(null);
  const [addLineItemModal, setAddLineItemModal] = useState<AddLineItemModalState | null>(null);
  const addSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (addSearchTimerRef.current) clearTimeout(addSearchTimerRef.current);
    };
  }, []);

  const applyRefreshedOrder = (row: OrderRow) => {
    setOrders((prev) => prev.map((o) => (o.id === row.id ? row : o)));
    resetOrderSelections(row.id);
  };

  const openDeleteLineItemModal = (order: OrderRow, item: OrderItem) => {
    if (!userIsAdmin) return;
    if (blockTestModeAction()) return;
    setDeleteLineItemModal({
      order,
      item,
      restockable: Boolean(item.productId),
      restock: true,
      saving: false,
      error: '',
    });
  };

  const closeDeleteLineItemModal = () => setDeleteLineItemModal(null);

  const submitDeleteLineItem = async () => {
    if (!deleteLineItemModal) return;
    const { order, item, restock } = deleteLineItemModal;
    setDeleteLineItemModal((prev) => (prev ? { ...prev, saving: true, error: '' } : prev));
    try {
      const res = await fetch(`/api/orders/${order.id}/line-items/${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restock }),
      });
      const json = (await res.json()) as ApiResponse<OrderRow>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to remove line item'));
      applyRefreshedOrder(json.data);
      toast.success(json.message || 'Line item removed.');
      setDeleteLineItemModal(null);
    } catch (err) {
      setDeleteLineItemModal((prev) => (
        prev ? { ...prev, saving: false, error: err instanceof Error ? err.message : 'Failed to remove line item' } : prev
      ));
    }
  };

  const openEditLineItemModal = (order: OrderRow, item: OrderItem) => {
    if (!userIsAdmin) return;
    if (blockTestModeAction()) return;
    const fulfilledQty = getFulfilledQty(order, item.id);
    setEditLineItemModal({
      order,
      item,
      titleEditable: !item.productId,
      title: item.title ?? item.name,
      quantity: item.qty,
      minQuantity: Math.max(1, fulfilledQty),
      restockable: Boolean(item.productId),
      restock: false,
      saving: false,
      error: '',
    });
  };

  const closeEditLineItemModal = () => setEditLineItemModal(null);

  const setEditLineItemQuantity = (quantity: number) => {
    setEditLineItemModal((prev) => (prev ? { ...prev, quantity } : prev));
  };

  const setEditLineItemTitle = (title: string) => {
    setEditLineItemModal((prev) => (prev ? { ...prev, title } : prev));
  };

  const setEditLineItemRestock = (restock: boolean) => {
    setEditLineItemModal((prev) => (prev ? { ...prev, restock } : prev));
  };

  const submitEditLineItem = async () => {
    if (!editLineItemModal) return;
    const { order, item, title, quantity, restock, titleEditable } = editLineItemModal;
    setEditLineItemModal((prev) => (prev ? { ...prev, saving: true, error: '' } : prev));
    try {
      const res = await fetch(`/api/orders/${order.id}/line-items/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity,
          restock,
          ...(titleEditable ? { title } : {}),
        }),
      });
      const json = (await res.json()) as ApiResponse<OrderRow>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to update line item'));
      applyRefreshedOrder(json.data);
      toast.success(json.message || 'Line item updated.');
      setEditLineItemModal(null);
    } catch (err) {
      setEditLineItemModal((prev) => (
        prev ? { ...prev, saving: false, error: err instanceof Error ? err.message : 'Failed to update line item' } : prev
      ));
    }
  };

  const openAddLineItemModal = (order: OrderRow, afterLineItemId: string) => {
    if (!userIsAdmin) return;
    if (blockTestModeAction()) return;
    setAddLineItemModal({
      order,
      afterLineItemId,
      mode: 'variant',
      query: '',
      results: [],
      searching: false,
      selectedVariantId: '',
      customTitle: '',
      customPrice: '',
      currencyCode: null,
      quantity: 1,
      saving: false,
      error: '',
    });
    void fetchAddLineItemCurrency(order.id);
  };

  const fetchAddLineItemCurrency = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/currency`);
      const json = (await res.json()) as ApiResponse<{ currencyCode: string }>;
      if (!res.ok || !json.success) return;
      setAddLineItemModal((prev) => (prev ? { ...prev, currencyCode: json.data.currencyCode } : prev));
    } catch {
      // Currency label is informational only — silently skip on failure.
    }
  };

  const closeAddLineItemModal = () => {
    if (addSearchTimerRef.current) clearTimeout(addSearchTimerRef.current);
    setAddLineItemModal(null);
  };

  const setAddLineItemMode = (mode: 'variant' | 'custom') => {
    setAddLineItemModal((prev) => (prev ? { ...prev, mode, error: '' } : prev));
  };

  const setAddLineItemQuantity = (quantity: number) => {
    setAddLineItemModal((prev) => (prev ? { ...prev, quantity } : prev));
  };

  const setAddLineItemCustomTitle = (customTitle: string) => {
    setAddLineItemModal((prev) => (prev ? { ...prev, customTitle } : prev));
  };

  const setAddLineItemCustomPrice = (customPrice: string) => {
    setAddLineItemModal((prev) => (prev ? { ...prev, customPrice } : prev));
  };

  const selectAddLineItemVariant = (variantShopifyId: string) => {
    setAddLineItemModal((prev) => (prev ? { ...prev, selectedVariantId: variantShopifyId } : prev));
  };

  const searchAddLineItemVariants = async (orderId: string, query: string) => {
    setAddLineItemModal((prev) => (prev ? { ...prev, searching: true } : prev));
    try {
      const res = await fetch(`/api/orders/${orderId}/variant-search?q=${encodeURIComponent(query)}`);
      const json = (await res.json()) as ApiResponse<VariantSearchResult[]>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to search variants'));
      setAddLineItemModal((prev) => (prev ? { ...prev, results: json.data, searching: false } : prev));
    } catch (err) {
      setAddLineItemModal((prev) => (
        prev ? { ...prev, searching: false, error: err instanceof Error ? err.message : 'Failed to search variants' } : prev
      ));
    }
  };

  const setAddLineItemQuery = (query: string) => {
    setAddLineItemModal((prev) => (prev ? { ...prev, query } : prev));
    if (addSearchTimerRef.current) clearTimeout(addSearchTimerRef.current);
    if (!addLineItemModal) return;
    const orderId = addLineItemModal.order.id;
    addSearchTimerRef.current = setTimeout(() => {
      void searchAddLineItemVariants(orderId, query);
    }, 300);
  };

  const submitAddLineItem = async () => {
    if (!addLineItemModal) return;
    const { order, afterLineItemId, mode, selectedVariantId, customTitle, customPrice, quantity } = addLineItemModal;

    if (mode === 'variant' && !selectedVariantId) {
      setAddLineItemModal((prev) => (prev ? { ...prev, error: 'Select a product to add.' } : prev));
      return;
    }
    if (mode === 'custom' && !customTitle.trim()) {
      setAddLineItemModal((prev) => (prev ? { ...prev, error: 'Title is required.' } : prev));
      return;
    }

    setAddLineItemModal((prev) => (prev ? { ...prev, saving: true, error: '' } : prev));
    try {
      const res = await fetch(`/api/orders/${order.id}/line-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          variantId: mode === 'variant' ? selectedVariantId : undefined,
          title: mode === 'custom' ? customTitle : undefined,
          price: mode === 'custom' ? customPrice : undefined,
          quantity,
          afterLineItemId,
        }),
      });
      const json = (await res.json()) as ApiResponse<OrderRow>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to add line item'));
      applyRefreshedOrder(json.data);
      toast.success(json.message || 'Line item added.');
      setAddLineItemModal(null);
    } catch (err) {
      setAddLineItemModal((prev) => (
        prev ? { ...prev, saving: false, error: err instanceof Error ? err.message : 'Failed to add line item' } : prev
      ));
    }
  };

  return {
    deleteLineItemModal,
    openDeleteLineItemModal,
    closeDeleteLineItemModal,
    setDeleteLineItemModal,
    submitDeleteLineItem,
    editLineItemModal,
    openEditLineItemModal,
    closeEditLineItemModal,
    setEditLineItemQuantity,
    setEditLineItemTitle,
    setEditLineItemRestock,
    submitEditLineItem,
    addLineItemModal,
    openAddLineItemModal,
    closeAddLineItemModal,
    setAddLineItemMode,
    setAddLineItemQuantity,
    setAddLineItemCustomTitle,
    setAddLineItemCustomPrice,
    selectAddLineItemVariant,
    setAddLineItemQuery,
    submitAddLineItem,
  };
}
