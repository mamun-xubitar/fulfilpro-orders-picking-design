'use client';

import type { useProductsTable } from './hooks/useProductsTable';

type ProductsSelectionBarProps = { table: ReturnType<typeof useProductsTable> };

export default function ProductsSelectionBar({ table }: ProductsSelectionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-blue-50/40 px-2 py-1.5">
      <label className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-[11px] text-gray-700">
        <input
          type="checkbox"
          checked={table.isCurrentPageAllSelected}
          onChange={table.toggleSelectAllOnPage}
          className="h-3 w-3 rounded border-gray-300 text-blue-600 cursor-pointer"
        />
        Select all on this page
      </label>
      <label className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-[11px] text-gray-700">
        <input
          type="checkbox"
          checked={table.selectAllFilters}
          onChange={table.toggleSelectAllFilters}
          className="h-3 w-3 rounded border-gray-300 text-blue-600 cursor-pointer"
        />
        Select all matching filters
      </label>
      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold leading-none text-blue-700">
        {table.selectAllFilters ? `All matching filters (${table.pagination.total})` : `${table.selectedIds.length} selected`}
      </span>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => table.setStatusModal('ACTIVE')}
          disabled={table.bulkRunning}
          className="h-[22px] rounded-[6px] border border-gray-300 px-[6px] text-[10px] font-bold leading-none text-gray-600 transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          Set status
        </button>
        <button
          type="button"
          onClick={() => table.setVerified(true)}
          disabled={table.bulkRunning}
          className="h-[22px] rounded-[6px] border border-gray-300 px-[6px] text-[10px] font-bold leading-none text-gray-600 transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          Mark verified
        </button>
        <button
          type="button"
          onClick={() => table.setVerified(false)}
          disabled={table.bulkRunning}
          className="h-[22px] rounded-[6px] border border-gray-300 px-[6px] text-[10px] font-bold leading-none text-gray-600 transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          Mark unverified
        </button>
        <button
          type="button"
          onClick={() => table.bulkSetOmitted(true)}
          disabled={table.bulkRunning}
          className="h-[22px] rounded-[6px] border border-gray-300 px-[6px] text-[10px] font-bold leading-none text-gray-600 transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          Omit
        </button>
        <button
          type="button"
          onClick={() => table.bulkSetOmitted(false)}
          disabled={table.bulkRunning}
          className="h-[22px] rounded-[6px] border border-gray-300 px-[6px] text-[10px] font-bold leading-none text-gray-600 transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          Un-omit
        </button>
        <button
          type="button"
          onClick={() => table.setDeleteConfirm({ kind: 'selection' })}
          disabled={table.bulkRunning}
          className="h-[22px] rounded-[6px] border border-red-200 px-[6px] text-[10px] font-bold leading-none text-red-600 transition-colors duration-150 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={table.clearSelection}
          disabled={table.bulkRunning}
          className="h-[22px] px-[6px] text-[11px] text-gray-500 transition-colors duration-150 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
