'use client';

import { useInventoryAccess } from './InventoryAccess';
import { panelBorderClass } from './MainImagePanel';
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
  const { canEdit } = useInventoryAccess();
  // In table mode the count reflects the products table's own filtered total (search, status,
  // supplier, quick filter and all) instead of the record stepper's verified-only count, so it
  // never disagrees with the visible rows — the "n /" position is dropped since paging has no
  // single-record position while the pager buttons are disabled.
  const countLabel = nav.allRecords
    ? `${formatNumber(p.productsTable.pagination.total)} of ${formatNumber(nav.totalCount)}`
    : `${nav.position} / ${formatNumber(nav.filteredCount)} of ${formatNumber(nav.totalCount)}`;

  return (
    <div className={`flex flex-wrap items-center gap-[6px] rounded-[10px] border ${panelBorderClass('toolbar')} bg-inventory-surface px-[8px] py-[4px] shadow-inventory`}>
      <Toggle label="See List" checked={nav.allRecords} onChange={nav.setAllRecords} />
      <Toggle label="Verified" checked={nav.verifiedOnly} onChange={nav.setVerifiedOnly} />

      <div className="flex items-center gap-[2px]">
        <PagerButton label="First product" onClick={nav.goFirst} disabled={!nav.canPrev || nav.allRecords}>
          <First className="h-3 w-3" />
        </PagerButton>
        <PagerButton label="Previous product" onClick={nav.goPrev} disabled={!nav.canPrev || nav.allRecords}>
          <ChevronLeft className="h-3 w-3" />
        </PagerButton>
        <span className="min-w-20 whitespace-nowrap px-[4px] text-center text-[11.5px] font-bold leading-none text-inventory-text tabular-nums" aria-live="polite">
          {countLabel}
        </span>
        <PagerButton label="Next product" onClick={nav.goNext} disabled={!nav.canNext || nav.allRecords}>
          <ChevronRight className="h-3 w-3" />
        </PagerButton>
        <PagerButton label="Last product" onClick={nav.goLast} disabled={!nav.canNext || nav.allRecords}>
          <Last className="h-3 w-3" />
        </PagerButton>
      </div>

      <span className="h-[18px] w-px bg-inventory-border" aria-hidden="true" />

      <ProductSearchBox
        value={nav.searchInput}
        onChange={nav.setSearchInput}
        open={nav.searchOpen}
        setOpen={nav.setSearchOpen}
        results={nav.searchResults}
        containerRef={nav.searchRef}
        onSelect={nav.selectProduct}
      />

      <div className="flex flex-wrap items-center gap-[4px]">
        {QUICK_FILTERS.map((filter) => {
          const isActive = nav.quickFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => nav.toggleQuickFilter(filter.id)}
              aria-pressed={isActive}
              className={`whitespace-nowrap rounded-full border px-[7px] py-[2px] text-[10px] font-semibold leading-none transition-colors duration-150 cursor-pointer ${
                isActive ? 'border-inventory-accent bg-inventory-accent text-inventory-accent-ink shadow-inventory' : 'border-inventory-warning/30 bg-inventory-warning/10 text-inventory-warning-ink hover:bg-inventory-warning/15'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <span className="ml-auto" />

      {canEdit && (
      <>
      <button
        type="button"
        onClick={p.importProducts.openModal}
        disabled={p.importProducts.importing}
        title={p.importProducts.importing ? 'Importing products and downloading their images…' : undefined}
        className="flex h-[22px] items-center gap-1 whitespace-nowrap rounded-[6px] border border-inventory-success/35 bg-inventory-success/10 px-[6px] text-[10px] font-bold leading-none text-inventory-success-hover shadow-sm transition-colors duration-150 hover:bg-inventory-success/15 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
      >
        {p.importProducts.importing ? (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-inventory-success/30 border-t-inventory-success-hover" aria-hidden="true" />
        ) : (
          <Upload className="h-3 w-3" />
        )}
        {p.importProducts.importing ? 'Importing…' : 'Import'}
      </button>
      <button
        type="button"
        onClick={p.openNewProduct}
        className="flex h-[22px] items-center gap-1 whitespace-nowrap rounded-[6px] bg-inventory-success px-[6px] text-[10px] font-bold leading-none text-white shadow-sm transition-colors duration-150 hover:bg-inventory-success-hover cursor-pointer"
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
        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border border-inventory-danger/30 bg-inventory-danger/10 text-inventory-danger shadow-sm transition-colors duration-150 hover:bg-inventory-danger/15 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
      >
        <Trash className="h-3 w-3" />
      </button>
      </>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label
      className={`flex items-center gap-[4px] whitespace-nowrap text-[10.5px] font-medium leading-none ${disabled ? 'cursor-not-allowed text-inventory-text-subtle' : 'cursor-pointer text-inventory-text-muted'}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3 w-3 cursor-pointer accent-inventory-primary disabled:cursor-not-allowed"
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
      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border border-inventory-border-strong bg-inventory-surface text-inventory-text-muted transition-colors duration-150 hover:bg-inventory-surface-hover disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
    >
      {children}
    </button>
  );
}
