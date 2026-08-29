'use client';

import type { useProductsTable } from './hooks/useProductsTable';

type ProductsSelectionBarProps = { table: ReturnType<typeof useProductsTable> };

export default function ProductsSelectionBar({ table }: ProductsSelectionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-blue-50/40 px-4 py-2.5">
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={table.isCurrentPageAllSelected}
          onChange={table.toggleSelectAllOnPage}
          className="rounded border-gray-300 text-blue-600 cursor-pointer"
        />
        Select all on this page
      </label>
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={table.selectAllFilters}
          onChange={table.toggleSelectAllFilters}
          className="rounded border-gray-300 text-blue-600 cursor-pointer"
        />
        Select all matching filters
      </label>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
        {table.selectAllFilters ? `All matching filters (${table.pagination.total})` : `${table.selectedIds.length} selected`}
      </span>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => table.setStatusModal('ACTIVE')}
          disabled={table.bulkRunning}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          Set status
        </button>
        <button
          type="button"
          onClick={() => table.setVerified(true)}
          disabled={table.bulkRunning}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          Mark verified
        </button>
        <button
          type="button"
          onClick={() => table.setVerified(false)}
          disabled={table.bulkRunning}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          Mark unverified
        </button>
        <button
          type="button"
          onClick={() => table.setDeleteConfirm({ kind: 'selection' })}
          disabled={table.bulkRunning}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={table.clearSelection}
          disabled={table.bulkRunning}
          className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
