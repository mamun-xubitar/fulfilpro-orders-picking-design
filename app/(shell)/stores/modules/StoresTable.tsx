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
  selectedIds: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onMarginChange: (id: string, margin: number) => void;
  onSaveMargin: (id: string) => void;
  onDisconnect: (id: string) => void;
  onReconnect: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenNotes: (id: string, name: string) => void;
  isMarginDirty: (store: StoreRow) => boolean;
  savingMarginIds: string[];
  disconnectingIds: string[];
  deletingIds: string[];
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: 7 }).map((_, i) => (
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
  selectedIds,
  onSelectAll,
  onSelectOne,
  onMarginChange,
  onSaveMargin,
  onDisconnect,
  onReconnect,
  onDelete,
  onOpenNotes,
  isMarginDirty,
  savingMarginIds,
  disconnectingIds,
  deletingIds,
}: StoresTableProps) {
  const allSelected = stores.length > 0 && selectedIds.length === stores.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < stores.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 w-10">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 cursor-pointer"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected; }}
                onChange={(e) => onSelectAll(e.target.checked)}
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Store Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Domain</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Margin %</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}

          {!isLoading && stores.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center text-gray-400 py-16 text-sm">
                No stores connected yet.
              </td>
            </tr>
          )}

          {!isLoading && stores.map((store) => {
            const sc = STATUS_MAP[store.status] ?? STATUS_MAP.disconnected;
            const isSavingMargin = savingMarginIds.includes(store.id);
            const isDisconnecting = disconnectingIds.includes(store.id);
            const isDeleting = deletingIds.includes(store.id);
            const isBusy = isSavingMargin || isDisconnecting || isDeleting;

            return (
              <tr key={store.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-100">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 cursor-pointer"
                    checked={selectedIds.includes(store.id)}
                    disabled={isBusy}
                    onChange={(e) => onSelectOne(store.id, e.target.checked)}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{store.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{store.storeDomain}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={store.profitMargin ?? 0}
                      disabled={isBusy}
                      onChange={(e) => onMarginChange(store.id, parseFloat(e.target.value) || 0)}
                      className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                    {isMarginDirty(store) && (
                      <button
                        onClick={() => onSaveMargin(store.id)}
                        disabled={isBusy}
                        className="px-2 py-1 text-xs bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 cursor-pointer"
                      >
                        {isSavingMargin ? 'Saving…' : 'Save'}
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.chip}`}>
                    {sc.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onOpenNotes(store.id, store.name ?? store.storeDomain)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1 px-2 py-1 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {store.notes.length} note{store.notes.length !== 1 ? 's' : ''}
                  </button>
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
