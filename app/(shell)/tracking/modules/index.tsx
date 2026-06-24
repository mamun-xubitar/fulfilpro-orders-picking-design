'use client';

import { useSession } from 'next-auth/react';
import { useTrackingPage } from './hooks/useTrackingPage';
import TrackingToolbar from './TrackingToolbar';
import TrackingTable from './TrackingTable';

export default function TrackingPage() {
  const { data: session } = useSession();
  const userIsAdmin = (session?.user?.role as string) === 'admin';
  const p = useTrackingPage();

  return (
    <main className="flex-1 p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-gray-900">Shipment Tracking</h1>
        {p.pagination.total > 0 && (
          <span className="text-xs text-gray-500">{p.pagination.total} record{p.pagination.total !== 1 ? 's' : ''}</span>
        )}
      </div>

      <TrackingToolbar
        searchInput={p.searchInput}
        onSearchChange={p.handleSearchChange}
        userIsAdmin={userIsAdmin}
        onBulkRegister={() => void p.openBulkModal()}
      />

      {p.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{p.error}</div>
      )}

      <TrackingTable
        rows={p.rows}
        loading={p.loading}
        expandedIds={p.expandedIds}
        onToggle={p.toggleExpand}
        pagination={p.pagination}
        onPageChange={(newPage) => p.setPage(newPage)}
      />

      {p.bulkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60"
          role="dialog"
          aria-modal="true"
          onClick={p.closeBulkModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Register Existing Orders</h2>
              <p className="text-xs text-gray-500 mt-0.5">Queue a bulk registration job for all orders with unregistered tracking numbers.</p>
            </div>
            <div className="p-5">
              {p.bulkModal.error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{p.bulkModal.error}</div>
              )}
              {p.bulkModal.loading ? (
                <p className="text-sm text-gray-500">Counting unregistered orders…</p>
              ) : (
                <p className="text-sm text-gray-700">
                  {p.bulkModal.count === 0
                    ? 'All orders with tracking numbers are already registered.'
                    : `${p.bulkModal.count ?? '?'} order${p.bulkModal.count !== 1 ? 's' : ''} with unregistered tracking numbers will be queued for registration.`}
                </p>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={p.closeBulkModal}
                disabled={p.bulkModal.submitting}
                className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void p.submitBulkRegister()}
                disabled={p.bulkModal.submitting || p.bulkModal.loading || p.bulkModal.count === 0}
                className="px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {p.bulkModal.submitting ? 'Queuing…' : 'Queue Registration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
