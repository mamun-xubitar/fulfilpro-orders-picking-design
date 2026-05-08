'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';

type BackInStockStatus = 'pending' | 'partially_back_in_stock' | 'back_in_stock';
type BackInStockItem = { lineItemId: string; dueDate: string; supplierName: string; quantity: number; item: string; restockedQuantity?: number };
type BackInStockMessage = {
  id: string;
  senderName: string;
  senderEmail: string;
  senderRole: string;
  message: string;
  status: BackInStockStatus | null;
  createdAt: string;
};
type BackInStockRequest = {
  id: string;
  orderId: string;
  orderNumber: string;
  requesterName: string;
  requesterEmail: string;
  status: BackInStockStatus;
  items: BackInStockItem[];
  requestMessage: string | null;
  unreadUpdateCount: number;
  messages: BackInStockMessage[];
  createdAt: string;
  updatedAt: string;
};
type Pagination = { page: number; pageSize: number; total: number; totalPages: number; hasPrev: boolean; hasNext: boolean };
type ApiResponse<T> = { success: boolean; message: string; data: T; errors?: string[] };
type AdminDraft = { quantities: Record<string, number>; message: string; saving: boolean };
type PaginationItem = number | 'ellipsis';

const STATUSES: Array<{ value: '' | BackInStockStatus; label: string }> = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'partially_back_in_stock', label: 'Partially back in stock' },
  { value: 'back_in_stock', label: 'Back in stock' },
];

export default function BackInStockPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
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
    if (total <= 5) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    if (pagination.page <= 2) {
      return [1, 2, 3, 'ellipsis', total];
    }

    if (pagination.page >= total - 1) {
      return [1, 'ellipsis', total - 2, total - 1, total];
    }

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
          json.data.requests.forEach((request) => {
            if (!next[request.id]) next[request.id] = createAdminDraft(request);
          });
          return next;
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load requests');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchRequests();

    return () => {
      cancelled = true;
    };
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

  const goToPage = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const submitAdminUpdate = async (request: BackInStockRequest) => {
    const draft = adminDrafts[request.id] ?? createAdminDraft(request);
    const items = request.items.map((item) => ({
      lineItemId: item.lineItemId,
      restockedQuantity: Math.min(item.quantity, Math.max(0, Number(draft.quantities[item.lineItemId] ?? item.restockedQuantity ?? 0) || 0)),
    }));
    const changed = items.some((item) => (
      item.restockedQuantity !== (request.items.find((row) => row.lineItemId === item.lineItemId)?.restockedQuantity ?? 0)
    ));
    if (!draft.message.trim() && !changed) {
      toast.error('Add a message or change a restocked quantity.');
      return;
    }
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

  return (
    <main className="p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Back In Stock</h2>
          <p className="text-sm text-gray-500">{isAdmin ? 'Manage stock requests and notify requesters.' : 'Track your stock requests and admin updates.'}</p>
        </div>
        <button onClick={() => setReloadToken((prev) => prev + 1)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Refresh</button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px]">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          placeholder="Search order, requester, or email"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          {STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Requester</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="py-12 text-center text-gray-400">Loading requests...</td></tr>}
              {!loading && error && <tr><td colSpan={6} className="py-12 text-center text-red-500">{error}</td></tr>}
              {!loading && !error && requests.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-gray-400">No requests found.</td></tr>}
              {!loading && !error && requests.map((request) => {
                const expanded = expandedId === request.id;
                const draft = adminDrafts[request.id] ?? createAdminDraft(request);
                return (
                  <Fragment key={request.id}>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-3 font-mono font-medium text-gray-900">#{request.orderNumber}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{request.requesterName}</div>
                        <div className="text-xs text-gray-500">{request.requesterEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusChipClass(request.status)}`}>
                          {formatStatus(request.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{request.items.length}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(request.updatedAt).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setExpandedId(expanded ? null : request.id)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                          {expanded ? 'Hide' : 'Details'}
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={6} className="border-b border-gray-100 bg-gray-50 px-4 py-4">
                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div>
                              <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">Product Details</h3>
                              <div className="space-y-2">
                                {request.items.map((item, index) => (
                                  <div key={index} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                      <div className="min-w-0">
                                        <div className="font-medium text-gray-900">{item.item}</div>
                                        <div className="mt-1 text-xs text-gray-500">Supplier: {item.supplierName} · Requested: {item.quantity} · Due: {item.dueDate}</div>
                                        <div className="mt-1 text-xs font-medium text-gray-600">Restocked: {item.restockedQuantity ?? 0} / {item.quantity}</div>
                                      </div>
                                      {isAdmin && (
                                        <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-gray-600">
                                          Restock
                                          <input
                                            type="number"
                                            min={0}
                                            max={item.quantity}
                                            value={draft.quantities[item.lineItemId] ?? item.restockedQuantity ?? 0}
                                            onChange={(e) => updateDraftQuantity(request, item.lineItemId, e.target.value)}
                                            className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                                          />
                                        </label>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {request.requestMessage && <p className="mt-3 whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">{request.requestMessage}</p>}
                            </div>
                            <div>
                              <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">Messages</h3>
                              <div className="max-h-56 space-y-2 overflow-y-auto">
                                {request.messages.length === 0 ? <p className="text-sm text-gray-400">No messages yet.</p> : request.messages.map((message) => (
                                  <div key={message.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
                                    <div className="flex justify-between gap-2">
                                      <span className="font-medium text-gray-800">{message.senderName}</span>
                                      <span className="text-xs text-gray-400">{new Date(message.createdAt).toLocaleString()}</span>
                                    </div>
                                    <p className="mt-1 whitespace-pre-wrap text-gray-700">{message.message}</p>
                                  </div>
                                ))}
                              </div>
                              {isAdmin && (
                                <div className="mt-4 space-y-2">
                                  <textarea value={draft.message} onChange={(e) => updateDraft(request.id, { message: e.target.value })} className="min-h-20 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Message to requester" />
                                  <button onClick={() => void submitAdminUpdate(request)} disabled={draft.saving} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                                    {draft.saving ? 'Sending...' : 'Send Update'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
          <span>{pagination.total} request{pagination.total === 1 ? '' : 's'}</span>
          <div className="flex items-center gap-1">
            <button disabled={!pagination.hasPrev || loading} onClick={() => goToPage(pagination.page - 1)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-600 disabled:opacity-40">Previous</button>
            {pageNumbers.map((pageNumber, index) => (
              pageNumber === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className="px-1.5 text-gray-400">...</span>
              ) : (
                <button
                  key={pageNumber}
                  disabled={loading}
                  onClick={() => goToPage(pageNumber)}
                  className={`rounded-lg border px-2.5 py-1.5 ${pagination.page === pageNumber ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100'}`}
                >
                  {pageNumber}
                </button>
              )
            ))}
            <button disabled={!pagination.hasNext || loading} onClick={() => goToPage(pagination.page + 1)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-600 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </main>
  );
}

function formatStatus(status: BackInStockStatus) {
  if (status === 'back_in_stock') return 'Back in stock';
  if (status === 'partially_back_in_stock') return 'Partially back in stock';
  return 'Pending';
}

function getStatusChipClass(status: BackInStockStatus) {
  if (status === 'back_in_stock') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (status === 'partially_back_in_stock') return 'bg-blue-50 text-blue-700 border border-blue-200';
  return 'bg-amber-50 text-amber-800 border border-amber-200';
}

function createAdminDraft(request: BackInStockRequest): AdminDraft {
  return {
    quantities: Object.fromEntries(request.items.map((item) => [item.lineItemId, item.restockedQuantity ?? 0])),
    message: '',
    saving: false,
  };
}
