'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

export type BackInStockStatus = 'pending' | 'partially_back_in_stock' | 'back_in_stock';
export type BackInStockItem = { lineItemId: string; dueDate: string; supplierName: string; quantity: number; item: string; restockedQuantity?: number };
export type BackInStockMessage = { id: string; senderName: string; senderEmail: string; senderRole: string; message: string; status: BackInStockStatus | null; createdAt: string };
export type BackInStockRequest = {
  id: string; orderId: string; orderNumber: string;
  requesterName: string; requesterEmail: string;
  status: BackInStockStatus; items: BackInStockItem[];
  requestMessage: string | null; unreadUpdateCount: number;
  messages: BackInStockMessage[]; createdAt: string; updatedAt: string;
};
export type Pagination = { page: number; pageSize: number; total: number; totalPages: number; hasPrev: boolean; hasNext: boolean };
export type AdminDraft = { quantities: Record<string, number>; message: string; saving: boolean };
export type PaginationItem = number | 'ellipsis';

type ApiResponse<T> = { success: boolean; message: string; data: T; errors?: string[] };

export function createAdminDraft(request: BackInStockRequest): AdminDraft {
  return {
    quantities: Object.fromEntries(request.items.map((item) => [item.lineItemId, item.restockedQuantity ?? 0])),
    message: '',
    saving: false,
  };
}

export function useBackInStockData() {
  const [requests, setRequests] = useState<BackInStockRequest[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 1, hasPrev: false, hasNext: false });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [adminDrafts, setAdminDrafts] = useState<Record<string, AdminDraft>>({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(pagination.page));
    params.set('pageSize', String(pagination.pageSize));
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    return params.toString();
  }, [pagination.page, pagination.pageSize, search, status]);

  const pageNumbers = useMemo<PaginationItem[]>(() => {
    const total = pagination.totalPages;
    if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
    if (pagination.page <= 2) return [1, 2, 3, 'ellipsis', total];
    if (pagination.page >= total - 1) return [1, 'ellipsis', total - 2, total - 1, total];
    return [1, 'ellipsis', pagination.page - 1, pagination.page, pagination.page + 1, 'ellipsis', total];
  }, [pagination.page, pagination.totalPages]);

  useEffect(() => {
    let cancelled = false;
    async function fetchRequests() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/back-in-stock?${queryString}`);
        const json = (await res.json()) as ApiResponse<{ requests: BackInStockRequest[]; pagination: Pagination }>;
        if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load requests');
        if (cancelled) return;
        setRequests(json.data.requests);
        setPagination(json.data.pagination);
        setAdminDrafts((prev) => {
          const next = { ...prev };
          json.data.requests.forEach((request) => { if (!next[request.id]) next[request.id] = createAdminDraft(request); });
          return next;
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load requests');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchRequests();
    return () => { cancelled = true; };
  }, [queryString, reloadToken]);

  const updateDraft = (id: string, patch: Partial<AdminDraft>) => {
    setAdminDrafts((prev) => ({ ...prev, [id]: { ...{ quantities: {}, message: '', saving: false }, ...prev[id], ...patch } }));
  };

  const updateDraftQuantity = (request: BackInStockRequest, lineItemId: string, value: string) => {
    const item = request.items.find((row) => row.lineItemId === lineItemId);
    const quantity = Math.min(item?.quantity ?? 0, Math.max(0, Number(value) || 0));
    const draft = adminDrafts[request.id] ?? createAdminDraft(request);
    updateDraft(request.id, { quantities: { ...draft.quantities, [lineItemId]: quantity } });
  };

  const goToPage = (page: number) => setPagination((prev) => ({ ...prev, page }));

  const submitAdminUpdate = async (request: BackInStockRequest) => {
    const draft = adminDrafts[request.id] ?? createAdminDraft(request);
    const items = request.items.map((item) => ({
      lineItemId: item.lineItemId,
      restockedQuantity: Math.min(item.quantity, Math.max(0, Number(draft.quantities[item.lineItemId] ?? item.restockedQuantity ?? 0) || 0)),
    }));
    const changed = items.some((item) => item.restockedQuantity !== (request.items.find((row) => row.lineItemId === item.lineItemId)?.restockedQuantity ?? 0));
    if (!draft.message.trim() && !changed) { toast.error('Add a message or change a restocked quantity.'); return; }
    updateDraft(request.id, { saving: true });
    try {
      const res = await fetch(`/api/back-in-stock/${encodeURIComponent(request.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, message: draft.message.trim() }),
      });
      const json = (await res.json()) as ApiResponse<BackInStockRequest>;
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update request');
      setRequests((prev) => prev.map((item) => item.id === request.id ? json.data : item));
      updateDraft(request.id, { ...createAdminDraft(json.data), saving: false });
      toast.success('Back in stock request updated.');
    } catch (err) {
      updateDraft(request.id, { saving: false });
      toast.error(err instanceof Error ? err.message : 'Failed to update request');
    }
  };

  return {
    requests, pagination, searchInput, setSearchInput,
    status, setStatus, setPagination,
    loading, error, expandedId, setExpandedId,
    reloadToken, setReloadToken, adminDrafts,
    pageNumbers, updateDraft, updateDraftQuantity,
    goToPage, submitAdminUpdate,
  };
}
