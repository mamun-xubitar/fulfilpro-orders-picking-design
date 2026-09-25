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
    <div className="flex flex-wrap items-center gap-[6px] border-b border-inventory-border px-2 py-1.5">
      <div className="relative min-w-44 flex-1 sm:flex-none sm:w-56">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-inventory-text-subtle" />
        <input
          type="search"
          value={table.searchInput}
          onChange={(e) => table.setSearch(e.target.value)}
          placeholder="Search products..."
          className="h-[24px] w-full rounded-[7px] border border-inventory-border-strong pl-7 pr-2 text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
        />
      </div>

      <select
        value={table.status}
        onChange={(e) => table.setStatus(e.target.value as typeof table.status)}
        className="h-[24px] rounded-[7px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[11px] leading-none text-inventory-text-muted outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer"
      >
        <option value="">All statuses</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        value={table.supplierId}
        onChange={(e) => table.setSupplierId(e.target.value)}
        className="h-[24px] rounded-[7px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[11px] leading-none text-inventory-text-muted outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer"
      >
        <option value="">All suppliers</option>
        {table.supplierOptions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <select
        value={table.categoryId}
        onChange={(e) => table.setCategoryId(e.target.value)}
        className="h-[24px] rounded-[7px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[11px] leading-none text-inventory-text-muted outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer"
      >
        <option value="">All categories</option>
        {table.categoryOptions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <label className="flex cursor-pointer items-center gap-[4px] whitespace-nowrap text-[10.5px] font-medium leading-none text-inventory-text-muted">
        <input
          type="checkbox"
          checked={table.includeOmitted}
          onChange={(e) => table.setIncludeOmitted(e.target.checked)}
          className="h-3 w-3 cursor-pointer accent-inventory-primary"
        />
        Show omitted
      </label>

      {table.hasActiveFilters && (
        <button
          type="button"
          onClick={table.handleClearFilters}
          className="flex h-[22px] items-center gap-1 rounded-[6px] px-[6px] text-[11px] text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-danger/10 hover:text-inventory-danger cursor-pointer"
        >
          Clear filters
        </button>
      )}

      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="ml-auto flex h-[22px] items-center gap-1 rounded-[6px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[10px] font-bold leading-none text-inventory-text-muted shadow-sm transition-colors duration-150 hover:bg-inventory-surface-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        <Refresh className="h-3 w-3" />
        Refresh
      </button>
    </div>
  );
}
