'use client';

import type { PurchaseRecommendTabState } from './hooks/usePurchaseRecommendTab';
import { Search } from './icons';
import type { SupplierOption } from './types';

const CONTROL =
  'h-[24px] rounded-[7px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer';

/** Search + supplier filter for the Purchase Recommend tab. */
export default function RecommendListToolbar({ tab, suppliers }: { tab: PurchaseRecommendTabState; suppliers: SupplierOption[] }) {
  return (
    <div className="flex flex-wrap items-center gap-[6px] border-b border-inventory-border px-2 py-1.5">
      <div className="relative min-w-44 flex-1 sm:w-64 sm:flex-none">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-inventory-text-subtle" />
        <input
          type="text"
          value={tab.searchInput}
          onChange={(e) => tab.setSearchInput(e.target.value)}
          placeholder="Search product, item no, brand, SKU…"
          aria-label="Search purchase recommendations"
          className="h-[24px] w-full rounded-[7px] border border-inventory-border-strong pl-7 pr-2 text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
        />
      </div>

      <select value={tab.supplierId} onChange={(e) => tab.setSupplierId(e.target.value)} aria-label="Supplier" className={`${CONTROL} max-w-[170px]`}>
        <option value="">All suppliers</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      {tab.hasFilters && (
        <button type="button" onClick={tab.clearFilters} className="h-[22px] rounded-[6px] px-[8px] text-[10px] font-bold text-inventory-secondary hover:bg-inventory-secondary/10 cursor-pointer">
          Clear filters
        </button>
      )}
    </div>
  );
}
