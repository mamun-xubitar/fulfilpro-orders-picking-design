'use client';

import ProductSearchBox from './ProductSearchBox';
import { QUICK_FILTERS } from './constants';
import { ChevronLeft, ChevronRight, First, Last, Plus, Search } from './icons';
import { formatNumber } from './utils';
import type { InventoryPage } from './hooks/useInventoryPage';

export default function ProductsToolbar(p: InventoryPage) {
  const { nav } = p;

  return (
    <div className="flex flex-wrap items-stretch gap-3">
      {/* Store-wide defaults */}
      <div className="flex flex-col justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <GlobalField
          label="Exchange rate"
          value={p.rateInput}
          onChange={p.setRateInput}
          onApply={p.applyGlobalRate}
          step="0.0001"
          suffix={p.globals.baseCurrency}
        />
        <GlobalField label="System wide margin" value={p.marginInput} onChange={p.setMarginInput} onApply={p.applyGlobalMargin} step="1" suffix="%" />
      </div>

      {/* Record navigation + search */}
      <div className="flex min-w-80 flex-1 flex-col justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-[1760px]:flex-nowrap">
          <Toggle label="All records" checked={nav.allRecords} onChange={nav.setAllRecords} />
          <Toggle label="Verified" checked={nav.verifiedOnly} disabled={nav.allRecords} onChange={nav.setVerifiedOnly} />

          <div className="flex items-center gap-1">
            <PagerButton label="First product" onClick={nav.goFirst} disabled={!nav.canPrev}>
              <First />
            </PagerButton>
            <PagerButton label="Previous product" onClick={nav.goPrev} disabled={!nav.canPrev}>
              <ChevronLeft />
            </PagerButton>
            <span className="min-w-28 px-2 text-center text-xs font-semibold text-gray-700 tabular-nums" aria-live="polite">
              {nav.position} / {formatNumber(nav.filteredCount)} of {formatNumber(nav.totalCount)}
            </span>
            <PagerButton label="Next product" onClick={nav.goNext} disabled={!nav.canNext}>
              <ChevronRight />
            </PagerButton>
            <PagerButton label="Last product" onClick={nav.goLast} disabled={!nav.canNext}>
              <Last />
            </PagerButton>
          </div>

          <div className="flex min-w-0 flex-1 basis-full items-center gap-2 min-[1760px]:basis-auto">
            <ProductSearchBox
              value={nav.searchInput}
              onChange={nav.setSearchInput}
              open={nav.searchOpen}
              setOpen={nav.setSearchOpen}
              results={nav.searchResults}
              containerRef={nav.searchRef}
              onSelect={nav.selectProduct}
            />
            <button
              type="button"
              onClick={p.openNewProduct}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-emerald-700 cursor-pointer"
            >
              <Plus />
              New Product
            </button>
          </div>
        </div>
      </div>

      {/* Price shortcut filters */}
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        {QUICK_FILTERS.map((filter) => {
          const isActive = nav.quickFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => nav.toggleQuickFilter(filter.id)}
              aria-pressed={isActive}
              disabled={nav.allRecords}
              className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                isActive ? 'border-amber-500 bg-amber-500 text-white' : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GlobalField({
  label,
  value,
  onChange,
  onApply,
  step,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onApply: () => void;
  step: string;
  suffix: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="w-36 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</label>
      <div className="relative">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="w-28 rounded-lg border border-gray-300 py-1.5 pl-2.5 pr-10 text-right text-[13px] font-semibold text-gray-900 tabular-nums outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">{suffix}</span>
      </div>
      <button
        type="button"
        onClick={onApply}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-blue-700 cursor-pointer"
      >
        Apply
      </button>
    </div>
  );
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-1.5 text-xs font-medium ${disabled ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer text-gray-700'}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
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
      className="rounded-lg border border-gray-300 bg-white p-1.5 text-gray-600 transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
    >
      {children}
    </button>
  );
}
