'use client';

import type { StocktakesTabState } from './hooks/useStocktakesTab';
import { Search } from './icons';
import { STOCKTAKE_STATUS_LABELS } from './StocktakesTable';

const CONTROL =
  'h-[24px] rounded-[7px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer';

/** Search + filters for the Stocktake tab. */
export default function StocktakeListToolbar({ tab }: { tab: StocktakesTabState }) {
  const { filters } = tab;
  return (
    <div className="flex flex-wrap items-center gap-[6px] border-b border-inventory-border px-2 py-1.5">
      <div className="relative min-w-44 flex-1 sm:w-64 sm:flex-none">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-inventory-text-subtle" />
        <input
          type="text"
          value={tab.searchInput}
          onChange={(e) => tab.setSearchInput(e.target.value)}
          placeholder="Search ST number, product, who…"
          aria-label="Search stocktakes"
          className="h-[24px] w-full rounded-[7px] border border-inventory-border-strong pl-7 pr-2 text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
        />
      </div>

      <select value={filters.status} onChange={(e) => tab.setFilter('status', e.target.value as typeof filters.status)} aria-label="Status" className={CONTROL}>
        <option value="">All statuses</option>
        {Object.entries(STOCKTAKE_STATUS_LABELS).map(([status, label]) => (
          <option key={status} value={status}>
            {label}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-[4px] text-[10px] font-semibold text-inventory-text-subtle">
        From
        <input type="date" value={filters.dateFrom} onChange={(e) => tab.setFilter('dateFrom', e.target.value)} className={CONTROL} />
      </label>
      <label className="flex items-center gap-[4px] text-[10px] font-semibold text-inventory-text-subtle">
        To
        <input type="date" value={filters.dateTo} onChange={(e) => tab.setFilter('dateTo', e.target.value)} className={CONTROL} />
      </label>

      {tab.hasFilters && (
        <button type="button" onClick={tab.clearFilters} className="h-[22px] rounded-[6px] px-[8px] text-[10px] font-bold text-inventory-secondary hover:bg-inventory-secondary/10 cursor-pointer">
          Clear filters
        </button>
      )}
    </div>
  );
}
