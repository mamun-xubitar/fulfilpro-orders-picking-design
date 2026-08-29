'use client';

import { STATUS_OPTIONS } from './constants';
import { Refresh, Search } from './icons';
import type { useProductsTable } from './hooks/useProductsTable';

type ProductsTableToolbarProps = {
  table: ReturnType<typeof useProductsTable>;
  onRefresh: () => void;
  loading: boolean;
};

export default function ProductsTableToolbar({ table, onRefresh, loading }: ProductsTableToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-4 py-3">
      <div className="relative min-w-56 flex-1 sm:flex-none sm:w-64">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={table.search}
          onChange={(e) => table.setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <select
        value={table.status}
        onChange={(e) => table.setStatus(e.target.value as typeof table.status)}
        className="rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
      >
        <option value="">All statuses</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        value={table.supplierName}
        onChange={(e) => table.setSupplierName(e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
      >
        <option value="">All suppliers</option>
        {table.supplierOptions.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      {table.hasActiveFilters && (
        <button
          type="button"
          onClick={table.handleClearFilters}
          className="flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm text-gray-500 transition-colors duration-150 hover:bg-red-50 hover:text-red-500 cursor-pointer"
        >
          Clear filters
        </button>
      )}

      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        <Refresh className="h-4 w-4" />
        Refresh
      </button>
    </div>
  );
}
