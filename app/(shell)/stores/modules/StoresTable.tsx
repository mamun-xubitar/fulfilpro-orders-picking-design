'use client';

import { StoreRow } from '@/models/store.model.server';

const STATUS_MAP: Record<string, { chip: string; label: string }> = {
  connected: { chip: 'bg-green-100 text-green-700', label: 'Connected' },
  disconnected: { chip: 'bg-gray-100 text-gray-500', label: 'Disconnected' },
  pending: { chip: 'bg-amber-100 text-amber-700', label: 'Pending' },
};

interface StoresTableProps {
  stores: StoreRow[];
  isLoading: boolean;
  onDisconnect: (id: string) => void;
  onReconnect: (id: string) => void;
  onDelete: (id: string) => void;
  disconnectingIds: string[];
  deletingIds: string[];
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: 4 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export default function StoresTable({
  stores,
  isLoading,
  onDisconnect,
  onReconnect,
  onDelete,
  disconnectingIds,
  deletingIds,
}: StoresTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Store Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Domain</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}

          {!isLoading && stores.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center text-gray-400 py-16 text-sm">
                No stores connected yet.
              </td>
            </tr>
          )}

          {!isLoading && stores.map((store) => {
            const sc = STATUS_MAP[store.status] ?? STATUS_MAP.disconnected;
            const isDisconnecting = disconnectingIds.includes(store.id);
            const isDeleting = deletingIds.includes(store.id);
            const isBusy = isDisconnecting || isDeleting;

            return (
              <tr key={store.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-100">
                <td className="px-4 py-3 font-medium text-gray-900">{store.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{store.storeDomain}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.chip}`}>
                    {sc.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {store.status === 'connected' && (
                      <button
                        onClick={() => onDisconnect(store.id)}
                        disabled={isBusy}
                        className="px-2.5 py-1 text-xs border border-amber-300 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors duration-150 disabled:opacity-50 cursor-pointer"
                      >
                        {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
                      </button>
                    )}
                    {store.status !== 'connected' && (
                      <>
                        <button
                          onClick={() => onReconnect(store.id)}
                          disabled={isBusy}
                          className="px-2.5 py-1 text-xs border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150 disabled:opacity-50 cursor-pointer"
                        >
                          {store.status === 'pending' ? 'Authorize' : 'Reconnect'}
                        </button>
                        <button
                          onClick={() => onDelete(store.id)}
                          disabled={isBusy}
                          className="px-2.5 py-1 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors duration-150 disabled:opacity-50 cursor-pointer"
                        >
                          {isDeleting ? 'Deleting…' : 'Delete'}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
