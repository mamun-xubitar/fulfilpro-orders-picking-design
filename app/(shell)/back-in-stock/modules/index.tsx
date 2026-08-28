'use client';

import { Fragment } from 'react';
import { useSession } from 'next-auth/react';
import { useBackInStockData, createAdminDraft, type BackInStockStatus, type BackInStockRequest } from './useBackInStockData';
import { useRequestStockModal } from './useRequestStockModal';
import RequestStockModal from './RequestStockModal';

const STATUSES: Array<{ value: '' | BackInStockStatus; label: string }> = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'partially_back_in_stock', label: 'Partially restocked' },
  { value: 'back_in_stock', label: 'Restocked' },
];

export default function BackInStockPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const d = useBackInStockData();
  const stock = useRequestStockModal(() => d.setReloadToken((prev) => prev + 1));

  return (
    <main className="p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Back In Stock</h2>
          <p className="text-sm text-gray-500">{isAdmin ? 'Manage stock requests and notify requesters.' : 'Track your stock requests and admin updates.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={stock.openModal} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50">Request Stock</button>
          <button onClick={() => d.setReloadToken((prev) => prev + 1)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Refresh</button>
        </div>
      </div>

      <RequestStockModal {...stock} />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px]">
        <input value={d.searchInput} onChange={(e) => d.setSearchInput(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" placeholder="Search order, requester, or email" />
        <select value={d.status} onChange={(e) => { d.setStatus(e.target.value); d.setPagination((prev) => ({ ...prev, page: 1 })); }} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
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
              {d.loading && <tr><td colSpan={6} className="py-12 text-center text-gray-400">Loading requests...</td></tr>}
              {!d.loading && d.error && <tr><td colSpan={6} className="py-12 text-center text-red-500">{d.error}</td></tr>}
              {!d.loading && !d.error && d.requests.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-gray-400">No requests found.</td></tr>}
              {!d.loading && !d.error && d.requests.map((request) => {
                const expanded = d.expandedId === request.id;
                const draft = d.adminDrafts[request.id] ?? createAdminDraft(request);
                return (
                  <Fragment key={request.id}>
                    <tr onClick={() => d.setExpandedId(expanded ? null : request.id)} className="border-b border-gray-100 cursor-pointer hover:bg-gray-50">
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
                        <button onClick={(e) => { e.stopPropagation(); d.setExpandedId(expanded ? null : request.id); }} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                          {expanded ? 'Hide' : 'Details'}
                        </button>
                      </td>
                    </tr>
                    {expanded && <ExpandedRow request={request} isAdmin={isAdmin} draft={draft} onUpdateDraft={(patch) => d.updateDraft(request.id, patch)} onUpdateDraftQuantity={(lineItemId, value) => d.updateDraftQuantity(request, lineItemId, value)} onSubmit={() => void d.submitAdminUpdate(request)} />}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
          <span>{d.pagination.total} request{d.pagination.total === 1 ? '' : 's'}</span>
          <div className="flex items-center gap-1">
            <button disabled={!d.pagination.hasPrev || d.loading} onClick={() => d.goToPage(d.pagination.page - 1)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-600 disabled:opacity-40">Previous</button>
            {d.pageNumbers.map((pageNumber, index) => (
              pageNumber === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className="px-1.5 text-gray-400">...</span>
              ) : (
                <button key={pageNumber} disabled={d.loading} onClick={() => d.goToPage(pageNumber)} className={`rounded-lg border px-2.5 py-1.5 ${d.pagination.page === pageNumber ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100'}`}>
                  {pageNumber}
                </button>
              )
            ))}
            <button disabled={!d.pagination.hasNext || d.loading} onClick={() => d.goToPage(d.pagination.page + 1)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-600 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </main>
  );
}

type ExpandedRowProps = {
  request: BackInStockRequest;
  isAdmin: boolean;
  draft: ReturnType<typeof createAdminDraft>;
  onUpdateDraft: (patch: { message?: string; saving?: boolean }) => void;
  onUpdateDraftQuantity: (lineItemId: string, value: string) => void;
  onSubmit: () => void;
};

function ExpandedRow({ request, isAdmin, draft, onUpdateDraft, onUpdateDraftQuantity, onSubmit }: ExpandedRowProps) {
  return (
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
                        <input type="number" min={0} max={item.quantity} value={draft.quantities[item.lineItemId] ?? item.restockedQuantity ?? 0} onChange={(e) => onUpdateDraftQuantity(item.lineItemId, e.target.value)} className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm" />
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
                <textarea value={draft.message} onChange={(e) => onUpdateDraft({ message: e.target.value })} className="min-h-20 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Message to requester" />
                <button onClick={onSubmit} disabled={draft.saving} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {draft.saving ? 'Sending...' : 'Send Update'}
                </button>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

function formatStatus(status: BackInStockStatus) {
  if (status === 'back_in_stock') return 'Restocked';
  if (status === 'partially_back_in_stock') return 'Partially Restocked';
  return 'Pending';
}

function getStatusChipClass(status: BackInStockStatus) {
  if (status === 'back_in_stock') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (status === 'partially_back_in_stock') return 'bg-blue-50 text-blue-700 border border-blue-200';
  return 'bg-amber-50 text-amber-800 border border-amber-200';
}
