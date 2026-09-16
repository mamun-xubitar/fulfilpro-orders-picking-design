'use client';

import ProductSearchBox from './ProductSearchBox';
import { QUICK_FILTERS } from './constants';
import type { InventoryPage } from './hooks/useInventoryPage';
import { ChevronLeft, ChevronRight, First, Last, Plus, Trash, Upload } from './icons';
import { formatNumber } from './utils';

/** Record navigation, search, quick filters and product actions — one row (design 6). Store-wide
 * pricing defaults (exchange rate / margin / per-store margin) moved out to `InventoryGlobals`,
 * rendered in the module-tabs row instead. */
export default function ProductsToolbar(p: InventoryPage) {
  const { nav } = p;
  // In table mode the count reflects the products table's own filtered total (search, status,
  // supplier, quick filter and all) instead of the record stepper's verified-only count, so it
  // never disagrees with the visible rows — the "n /" position is dropped since paging has no
  // single-record position while the pager buttons are disabled.
  const countLabel = nav.allRecords
    ? `${formatNumber(p.productsTable.pagination.total)} of ${formatNumber(nav.totalCount)}`
    : `${nav.position} / ${formatNumber(nav.filteredCount)} of ${formatNumber(nav.totalCount)}`;

  return (
    <div className="flex flex-wrap items-center gap-[6px] rounded-[10px] border border-gray-200 bg-white px-[8px] py-[4px] shadow-[0_1px_2px_0_rgb(0_0_0/0.05)]">
      <Toggle label="See List" checked={nav.allRecords} onChange={nav.setAllRecords} />
      <Toggle label="Verified" checked={nav.verifiedOnly} onChange={nav.setVerifiedOnly} />

      <div className="flex items-center gap-[2px]">
        <PagerButton label="First product" onClick={nav.goFirst} disabled={!nav.canPrev || nav.allRecords}>
          <First className="h-3 w-3" />
        </PagerButton>
        <PagerButton label="Previous product" onClick={nav.goPrev} disabled={!nav.canPrev || nav.allRecords}>
          <ChevronLeft className="h-3 w-3" />
        </PagerButton>
        <span className="min-w-20 whitespace-nowrap px-[4px] text-center text-[11.5px] font-bold leading-none text-gray-900 tabular-nums" aria-live="polite">
          {countLabel}
        </span>
        <PagerButton label="Next product" onClick={nav.goNext} disabled={!nav.canNext || nav.allRecords}>
          <ChevronRight className="h-3 w-3" />
        </PagerButton>
        <PagerButton label="Last product" onClick={nav.goLast} disabled={!nav.canNext || nav.allRecords}>
          <Last className="h-3 w-3" />
        </PagerButton>
      </div>

      <span className="h-[18px] w-px bg-gray-200" aria-hidden="true" />

      <ProductSearchBox
        value={nav.searchInput}
        onChange={nav.setSearchInput}
        open={nav.searchOpen}
        setOpen={nav.setSearchOpen}
        results={nav.searchResults}
        containerRef={nav.searchRef}
        onSelect={nav.selectProduct}
      />

      <div className="flex flex-nowrap items-center gap-[4px]">
        {QUICK_FILTERS.map((filter) => {
          const isActive = nav.quickFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => nav.toggleQuickFilter(filter.id)}
              aria-pressed={isActive}
              className={`whitespace-nowrap rounded-full border px-[7px] py-[2px] text-[10px] font-semibold leading-none transition-colors duration-150 cursor-pointer ${
                isActive ? 'border-amber-500 bg-amber-500 text-white' : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <span className="ml-auto" />

      <button
        type="button"
        onClick={p.importProducts.openModal}
        className="flex h-[22px] items-center gap-1 whitespace-nowrap rounded-[6px] border border-emerald-300 bg-emerald-50 px-[6px] text-[10px] font-bold leading-none text-emerald-700 shadow-sm transition-colors duration-150 hover:bg-emerald-100 cursor-pointer"
      >
        <Upload className="h-3 w-3" />
        Import
      </button>
      <button
        type="button"
        onClick={p.openNewProduct}
        className="flex h-[22px] items-center gap-1 whitespace-nowrap rounded-[6px] bg-emerald-600 px-[6px] text-[10px] font-bold leading-none text-white shadow-sm transition-colors duration-150 hover:bg-emerald-700 cursor-pointer"
      >
        <Plus className="h-3 w-3" />
        New Product
      </button>
      <button
        type="button"
        onClick={p.openDeleteProduct}
        disabled={!nav.product || nav.allRecords}
        title="Delete this product"
        aria-label="Delete this product"
        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border border-red-200 bg-red-50 text-red-600 shadow-sm transition-colors duration-150 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
      >
        <Trash className="h-3 w-3" />
      </button>
    </div>
  );
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label
      className={`flex items-center gap-[4px] whitespace-nowrap text-[10.5px] font-medium leading-none ${disabled ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer text-gray-700'}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3 w-3 cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
      />
      {label}
    </label>
  );
}

function PagerButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border border-gray-300 bg-white text-gray-600 transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
    >
      {children}
    </button>
  );
}
