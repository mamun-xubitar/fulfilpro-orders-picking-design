'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { usePagination, type PaginationState } from '@/hooks/usePagination';
import { buildMailtoHref, buildPoEmail, hasOutstandingItems } from '../utils';
import { usePoReceive } from './usePoReceive';
import type { ApiResponse, LocationOption, ProductDetail, PurchaseOrderListResponse, PurchaseOrderRow, PurchaseOrderStatus } from '../types';

const DEFAULT_PAGINATION: PaginationState = { page: 1, pageSize: 10, total: 0, totalPages: 1, hasPrev: false, hasNext: false };

type UsePurchaseOrdersArgs = {
  productId: string;
  product: ProductDetail | null;
  locations: LocationOption[];
  bumpRefresh: () => void;
};

export function usePurchaseOrders({ productId, product, locations, bumpRefresh }: UsePurchaseOrdersArgs) {
  const [panelExpanded, setPanelExpanded] = useState(false);
  const togglePanel = () => setPanelExpanded((prev) => !prev);

  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | ''>('');
  const [dateTo, setDateTo] = useState('');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const { pagination, setPagination, pageNumbers, goToPage } = usePagination(DEFAULT_PAGINATION);

  const refreshList = () => setRefreshToken((prev) => prev + 1);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [statusFilter, dateTo, setPagination]);

  const queryString = buildQueryString({ productId, statusFilter, dateTo, pagination });

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;

    const fetchList = async () => {
      setLoadingList(true);
      try {
        const res = await fetch(`/api/inventory/purchase-orders?${queryString}`);
        const json = (await res.json()) as ApiResponse<PurchaseOrderListResponse>;
        if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load purchase orders');
        if (cancelled) return;
        setPurchaseOrders(json.data.purchaseOrders);
        setPagination(json.data.pagination);
      } catch {
        if (!cancelled) setPurchaseOrders([]);
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    };

    void fetchList();
    return () => {
      cancelled = true;
    };
  }, [queryString, refreshToken, productId, setPagination]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createVariantIds, setCreateVariantIds] = useState<string[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [remark, setRemark] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const { request: requestCreate, loading: saving, errors: createErrors } = useRequest<PurchaseOrderRow>();

  const openCreate = (variantIds: string[]) => {
    const defaultSupplierId = product?.suppliers.attached[0]?.id ?? product?.suppliers.viaCollection[0]?.id ?? '';
    setCreateVariantIds(variantIds);
    setSupplierId(defaultSupplierId);
    setDeliveryDate('');
    setRemark('');
    setQuantities(Object.fromEntries(variantIds.map((id) => [id, '1'])));
    setCreateOpen(true);
  };

  const closeCreate = () => setCreateOpen(false);
  const setQuantity = (variantId: string, value: string) => setQuantities((prev) => ({ ...prev, [variantId]: value }));

  const buildEmailFor = (po: PurchaseOrderRow) =>
    buildPoEmail({ po, storeName: product?.store.name ?? '', onlineStoreUrl: product?.onlineStoreUrl ?? null });

  const sendEmailForPo = (po: PurchaseOrderRow) => {
    const { subject, body } = buildEmailFor(po);
    window.location.href = buildMailtoHref({ to: po.poEmail, subject, body });
  };

  const copyEmailBodyForPo = async (po: PurchaseOrderRow) => {
    const { body } = buildEmailFor(po);
    await navigator.clipboard.writeText(body);
    toast.success('Email body copied');
  };

  const saveAndSend = () => {
    const items = createVariantIds.map((variantId) => ({ variantId, quantity: Number(quantities[variantId] ?? '0') }));
    requestCreate({
      url: '/api/inventory/purchase-orders',
      method: 'POST',
      data: {
        supplierId,
        productId,
        deliveryDate: deliveryDate || undefined,
        remark: remark || undefined,
        items,
      } as unknown as Record<string, unknown>,
      successMessage: 'Purchase order created',
      validation: async () => {
        const errors: Record<string, string> = {};
        if (!supplierId) errors.supplierId = 'Supplier is required';
        if (items.some((item) => !Number.isFinite(item.quantity) || item.quantity < 1)) {
          errors.items = 'Enter a quantity of at least 1 for every variant';
        }
        return errors;
      },
      onSuccess: ({ data }) => {
        sendEmailForPo(data);
        setPanelExpanded(true);
        refreshList();
        setCreateOpen(false);
      },
    });
  };

  const [openPoId, setOpenPoId] = useState<string | null>(null);
  const openPo = purchaseOrders.find((po) => po.id === openPoId) ?? null;
  const { request: requestStatus, loading: updatingStatus } = useRequest<PurchaseOrderRow>();

  const openPoModal = (id: string) => setOpenPoId(id);
  const closePo = () => setOpenPoId(null);

  const updateStatus = (status: PurchaseOrderStatus) => {
    if (!openPoId) return;
    requestStatus({
      url: `/api/inventory/purchase-orders/${openPoId}`,
      method: 'PATCH',
      data: { status } as unknown as Record<string, unknown>,
      successMessage: 'Status updated',
      onSuccess: () => refreshList(),
    });
  };

  const receive = usePoReceive({ poId: openPoId, locations, refreshList, bumpRefresh });

  const handleStatusChange = (status: PurchaseOrderStatus) => {
    if (status === 'RECEIVED' && openPo && hasOutstandingItems(openPo)) {
      receive.openForOutstanding(openPo);
      return;
    }
    updateStatus(status);
  };

  return {
    panelExpanded,
    togglePanel,
    purchaseOrders,
    pagination,
    pageNumbers,
    goToPage,
    loadingList,
    statusFilter,
    setStatusFilter,
    dateTo,
    setDateTo,
    createOpen,
    openCreate,
    closeCreate,
    createVariantIds,
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
    openPoId,
    openPo,
    openPoModal,
    closePo,
    updateStatus,
    handleStatusChange,
    updatingStatus,
    sendEmailForPo,
    copyEmailBodyForPo,
    receive,
  };
}

function buildQueryString(params: {
  productId: string;
  statusFilter: PurchaseOrderStatus | '';
  dateTo: string;
  pagination: PaginationState;
}) {
  const query = new URLSearchParams();
  query.set('productId', params.productId);
  query.set('page', String(params.pagination.page));
  query.set('pageSize', String(params.pagination.pageSize));
  if (params.statusFilter) query.set('status', params.statusFilter);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  return query.toString();
}
