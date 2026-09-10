'use client';

import { useState } from 'react';
import ProductSearchBox from './ProductSearchBox';
import { QUICK_FILTERS } from './constants';
import { useGlobalStoreMargins } from './hooks/useGlobalStoreMargins';
import type { GlobalStoreMarginsState } from './hooks/useGlobalStoreMargins';
import type { InventoryPage } from './hooks/useInventoryPage';
import { ChevronDown, ChevronLeft, ChevronRight, First, Last, Plus, Search, Trash, Upload } from './icons';
import { formatNumber } from './utils';

export default function ProductsToolbar(p: InventoryPage) {
  const { nav } = p;
  const storeMargins = useGlobalStoreMargins();
  const [storeMarginsOpen, setStoreMarginsOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-stretch gap-3">
      {/* Store-wide defaults */}
      <div className="flex flex-col justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <GlobalField
          label="Exchange rate"
          value={p.rateInput}
          onChange={p.setRateInput}
          onApply={p.applyGlobalRate}
          step="0.01"
          suffix={p.globals.baseCurrency}
        />
        <GlobalField label="System wide margin" value={p.marginInput} onChange={p.setMarginInput} onApply={p.applyGlobalMargin} step="1" suffix="%" />

        <button
          type="button"
          onClick={() => setStoreMarginsOpen((v) => !v)}
          aria-expanded={storeMarginsOpen}
          className="flex w-fit items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          <ChevronDown className={`h-3 w-3 transition-transform duration-150 ${storeMarginsOpen ? 'rotate-180' : ''}`} />
          Per store margin
        </button>
        {storeMarginsOpen && <GlobalStoreMarginList state={storeMargins} />}
      </div>

      {/* Record navigation + search — always two rows: view controls (+ Import) on top, find/create below. */}
      <div className="flex min-w-80 flex-1 flex-col justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Toggle label="All records" checked={nav.allRecords} onChange={nav.setAllRecords} />
          <Toggle label="Verified" checked={nav.verifiedOnly} onChange={nav.setVerifiedOnly} />

          <div className="flex items-center gap-1">
            <PagerButton label="First product" onClick={nav.goFirst} disabled={!nav.canPrev || nav.allRecords}>
              <First />
            </PagerButton>
            <PagerButton label="Previous product" onClick={nav.goPrev} disabled={!nav.canPrev || nav.allRecords}>
              <ChevronLeft />
            </PagerButton>
            <span className="min-w-28 px-2 text-center text-xs font-semibold text-gray-700 tabular-nums" aria-live="polite">
              {nav.position} / {formatNumber(nav.filteredCount)} of {formatNumber(nav.totalCount)}
            </span>
            <PagerButton label="Next product" onClick={nav.goNext} disabled={!nav.canNext || nav.allRecords}>
              <ChevronRight />
            </PagerButton>
            <PagerButton label="Last product" onClick={nav.goLast} disabled={!nav.canNext || nav.allRecords}>
              <Last />
            </PagerButton>
          </div>

          <button
            type="button"
            onClick={p.importProducts.openModal}
            className="ml-auto flex items-center gap-1 whitespace-nowrap rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm transition-colors duration-150 hover:bg-emerald-100 cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            Import Products
          </button>
          <button
            type="button"
            onClick={p.openDeleteProduct}
            disabled={!nav.product || nav.allRecords}
            title="Delete this product"
            aria-label="Delete this product"
            className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 shadow-sm transition-colors duration-150 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <Trash className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
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
            className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 p-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-emerald-700 cursor-pointer"
          >
            <Plus />
            New Product
          </button>
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
              className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition-colors duration-150 cursor-pointer ${
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

/** Compact rows inside the expandable "Per store margin" section — one connected store per
 * row, each with its own inline % input + Apply, mirroring GlobalField's layout but stacked
 * rather than one-per-card since there can be several stores. */
function GlobalStoreMarginList({ state }: { state: GlobalStoreMarginsState }) {
  if (state.loading) return <p className="px-1 py-1 text-[11px] text-gray-400">Loading…</p>;
  if (state.stores.length === 0) return <p className="px-1 py-1 text-[11px] text-gray-400">No connected stores.</p>;

  return (
    <div className="space-y-1.5 border-t border-gray-100 pt-2">
      {state.stores.map((store) => (
        <div key={store.storeId} className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-gray-700" title={store.storeName}>
            {store.storeName}
          </span>
          <div className="relative">
            <input
              type="number"
              step="1"
              min="0"
              value={state.inputs[store.storeId] ?? ''}
              onChange={(e) => state.setInput(store.storeId, e.target.value)}
              aria-label={`Global default margin for ${store.storeName}`}
              placeholder="—"
              className="w-28 rounded-lg border border-gray-300 py-1 pl-2 pr-5 text-right text-[12px] tabular-nums outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">%</span>
          </div>
          <button
            type="button"
            onClick={() => state.apply(store.storeId)}
            disabled={state.saving}
            className="rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            Apply
          </button>
        </div>
      ))}
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
