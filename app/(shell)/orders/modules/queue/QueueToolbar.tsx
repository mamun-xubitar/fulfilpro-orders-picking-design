'use client';

import { useEffect, useRef } from 'react';
import type { OrdersPageBundle } from '../ordersPageContext';
import { FULFILLMENT_STATUSES, PACKING_STATUSES, SEARCH_FIELDS } from '../constants';
import { Icon } from './icons';
import FilterChip, { MenuCheck, MenuHeading, MenuOption } from './FilterChip';
import PeriodMenu from './PeriodMenu';

const PRINT_STATUSES = [
  { label: 'Slip Not Printed', value: 'not_printed' },
  { label: 'Slip Printed', value: 'printed' },
] as const;

const summarize = (values: string[], options: ReadonlyArray<{ label: string; value: string }>, all: string) => {
  if (values.length === 0) return all;
  if (values.length === 1) return options.find((o) => o.value === values[0])?.label ?? values[0];
  return `${values.length} selected`;
};

function SearchBox({ p }: { p: OrdersPageBundle }) {
  const { searchDropdownRef } = p;
  const inputRef = useRef<HTMLInputElement>(null);
  // "/" jumps to the search box, as the hint in it says.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || target?.closest('input, textarea, select, [contenteditable]')) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const fields = p.caps.barcodeSearch ? [...SEARCH_FIELDS, { label: 'Barcode', value: 'barcode' }] : SEARCH_FIELDS;
  const fieldLabel = fields.find((f) => f.value === p.searchField)?.label ?? 'All fields';
  const pick = (value: string) => { p.setSearchField(value); p.setSearchDropdownOpen(false); if (p.searchInput.trim()) p.setPagination((prev) => ({ ...prev, page: 1 })); };
  return (
    <div className="flex h-7 w-[360px] flex-none items-center gap-1.5 rounded-lg border border-orders-border-strong bg-orders-surface pl-2 pr-1 text-orders-text-subtle focus-within:border-orders-primary focus-within:shadow-[0_0_0_2px_var(--orders-primary-ring)]">
      <Icon name="search" className="h-3.5 w-3.5" />
      <div className="relative" ref={searchDropdownRef}>
        <button type="button" onClick={() => p.setSearchDropdownOpen((prev) => !prev)} aria-haspopup="menu" aria-expanded={p.searchDropdownOpen} className="inline-flex items-center gap-[3px] whitespace-nowrap rounded-[5px] border border-orders-primary-ring bg-orders-primary-soft py-px pl-1.5 pr-[3px] text-[10px] font-bold text-orders-primary-ink cursor-pointer">
          {fieldLabel}<Icon name="chevronDown" className="h-2.5 w-2.5" />
        </button>
        {p.searchDropdownOpen && (
          <div role="menu" className="absolute left-0 top-full z-30 mt-1 min-w-40 rounded-xl border border-orders-border bg-orders-surface py-1 shadow-orders-md">
            <MenuOption selected={p.searchField === ''} onClick={() => pick('')}>All fields</MenuOption>
            {fields.map((f) => <MenuOption key={f.value} selected={p.searchField === f.value} onClick={() => pick(f.value)}>{f.label}</MenuOption>)}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        value={p.searchInput}
        onChange={(e) => p.setSearchInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') p.setSearchInput(''); }}
        placeholder={p.caps.role === 'picker' ? 'Scan barcode or search order, customer, product…' : p.caps.barcodeSearch ? 'Scan barcode or search order, customer, address, product…' : 'Search order, customer, address, product…'}
        aria-label="Search orders"
        className="min-w-0 flex-1 bg-transparent text-[11.5px] text-orders-text outline-none placeholder:text-orders-text-subtle"
      />
      {p.caps.barcodeSearch && <Icon name="scan" className="h-3.5 w-3.5" />}
      <kbd className="rounded border border-b-2 border-orders-border bg-orders-surface-muted px-1 font-sans text-[9.5px] font-bold text-orders-text-subtle">/</kbd>
    </div>
  );
}

/** "Last synced: Nov 2, 2026, 4:04 PM" -> "Synced 4:04 PM" (the prototype's one-liner). */
const shortSync = (message: string) => (message.startsWith('Last synced:') ? `Synced ${message.split(',').pop()?.trim() ?? ''}` : message);

function SyncControls({ p }: { p: OrdersPageBundle }) {
  const { syncStoreDropdownRef } = p;
  const busy = p.syncing || p.loading || p.syncActive;
  return (
    <>
      <span className="whitespace-nowrap text-[10px] text-orders-text-subtle" title={p.syncMessage}>{shortSync(p.syncMessage)}</span>
      <div className="relative flex" ref={syncStoreDropdownRef}>
        <button type="button" onClick={p.handleSync} disabled={busy} className="inline-flex h-7 items-center gap-1 rounded-l-lg border border-r-0 border-orders-border-strong bg-orders-surface px-[9px] text-[11px] font-bold text-orders-text-body hover:bg-orders-surface-muted disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
          <Icon name="refresh" className={`h-3.5 w-3.5 ${p.syncing || p.syncActive ? 'animate-spin' : ''}`} />
          {p.syncActive ? 'Syncing…' : p.syncing ? 'Queueing…' : 'Sync'}
        </button>
        <button type="button" aria-label="Choose stores to sync" onClick={() => p.setSyncStoreDropdownOpen((prev) => !prev)} disabled={busy} className="inline-flex h-7 items-center rounded-r-lg border border-l-0 border-orders-border-strong bg-orders-surface px-[5px] text-orders-text-body hover:bg-orders-surface-muted disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
          <Icon name="chevronDown" className="h-3 w-3" />
        </button>
        {p.syncStoreDropdownOpen && (
          <div role="menu" className="absolute right-0 top-full z-30 mt-1 max-h-72 w-56 overflow-y-auto rounded-xl border border-orders-border bg-orders-surface py-1 shadow-orders-md">
            <MenuHeading>Select stores to sync</MenuHeading>
            <MenuOption selected={p.syncStoreIds.length === 0} onClick={() => p.setSyncStoreIds([])}>All stores</MenuOption>
            {p.stores.map((s) => <MenuCheck key={s.id} checked={p.syncStoreIds.includes(s.id)} onClick={() => p.handleSyncStoreToggle(s.id)}>{s.name}</MenuCheck>)}
          </div>
        )}
      </div>
    </>
  );
}

export default function QueueToolbar({ p }: { p: OrdersPageBundle }) {
  const { caps, storeDropdownRef, statusDropdownRef, packingStatusDropdownRef, printStatusDropdownRef } = p;
  const storeLabel = p.storeIds.length === 0 ? 'All stores' : `${p.storeIds.length} store${p.storeIds.length > 1 ? 's' : ''}`;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <SearchBox p={p} />
      {caps.store && (
        <FilterChip label="Store" value={storeLabel} active={p.storeIds.length > 0} open={p.storeDropdownOpen} onToggle={() => p.setStoreDropdownOpen((prev) => !prev)} dropdownRef={storeDropdownRef}>
          <MenuOption selected={p.storeIds.length === 0} onClick={() => { p.setStoreIds([]); p.setPagination((prev) => ({ ...prev, page: 1 })); }}>All stores</MenuOption>
          {p.stores.map((s) => <MenuCheck key={s.id} checked={p.storeIds.includes(s.id)} onClick={() => p.handleStoreToggle(s.id)}>{s.name}</MenuCheck>)}
        </FilterChip>
      )}
      {caps.period && <PeriodMenu p={p} />}
      {caps.fulfilment && (
        <FilterChip label="Status" value={summarize(p.fulfillmentStatuses, FULFILLMENT_STATUSES, 'All')} active={p.fulfillmentStatuses.length > 0} open={p.statusDropdownOpen} onToggle={() => p.setStatusDropdownOpen((prev) => !prev)} dropdownRef={statusDropdownRef}>
          <MenuHeading>Fulfilment status</MenuHeading>
          {FULFILLMENT_STATUSES.map((s) => <MenuCheck key={s.value} checked={p.fulfillmentStatuses.includes(s.value)} onClick={() => p.handleStatusToggle(s.value)}>{s.label}</MenuCheck>)}
        </FilterChip>
      )}
      <FilterChip label="Packed" value={summarize(p.packingStatuses, PACKING_STATUSES, 'All')} active={p.packingStatuses.length > 0} open={p.packingStatusDropdownOpen} onToggle={() => p.setPackingStatusDropdownOpen((prev) => !prev)} dropdownRef={packingStatusDropdownRef}>
        <MenuHeading>Packed status</MenuHeading>
        <MenuOption selected={p.packingStatuses.length === 0} onClick={() => p.handlePackingStatusToggle('__clear__')}>All packed statuses</MenuOption>
        {PACKING_STATUSES.map((s) => <MenuCheck key={s.value} checked={p.packingStatuses.includes(s.value)} onClick={() => p.handlePackingStatusToggle(s.value)}>{s.label}</MenuCheck>)}
      </FilterChip>
      {caps.slip && (
        <FilterChip label="Print" value={summarize(p.printStatuses, PRINT_STATUSES, 'All')} active={p.printStatuses.length > 0} open={p.printStatusDropdownOpen} onToggle={() => p.setPrintStatusDropdownOpen((prev) => !prev)} dropdownRef={printStatusDropdownRef}>
          <MenuHeading>Print status</MenuHeading>
          <MenuOption selected={p.printStatuses.length === 0} onClick={() => p.handlePrintStatusToggle('__clear__')}>All print statuses</MenuOption>
          {PRINT_STATUSES.map((s) => <MenuCheck key={s.value} checked={p.printStatuses.includes(s.value)} onClick={() => p.handlePrintStatusToggle(s.value)}>{s.label}</MenuCheck>)}
        </FilterChip>
      )}
      {p.hasActiveFilters && (
        <button type="button" onClick={p.handleClearFilters} className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-orders-primary-ink hover:bg-orders-primary-soft cursor-pointer">
          <Icon name="close" className="h-3 w-3" />Clear filters
        </button>
      )}
      <span className="flex-1" />
      {caps.sync && <SyncControls p={p} />}
      <button type="button" onClick={p.handleRefresh} disabled={p.syncing} title={p.syncRefreshNeeded ? 'A sync finished: refresh to see the changes' : 'Reload the list'} className={`inline-flex h-7 items-center gap-1 rounded-lg border px-[9px] text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${p.syncRefreshNeeded ? 'border-orders-warning-border bg-orders-warning-soft text-orders-warning-ink' : 'border-orders-border-strong bg-orders-surface text-orders-text-body hover:bg-orders-surface-muted'}`}>
        <Icon name="refresh" className="h-3.5 w-3.5" />Refresh
      </button>
    </div>
  );
}
