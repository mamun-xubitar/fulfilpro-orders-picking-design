'use client';

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
  const fields = p.caps.barcodeSearch ? [...SEARCH_FIELDS, { label: 'Barcode', value: 'barcode' }] : SEARCH_FIELDS;
  const fieldLabel = fields.find((f) => f.value === p.searchField)?.label ?? 'All fields';
  return (
    <div className="flex h-8 min-w-[260px] flex-1 items-center gap-1.5 rounded-lg border border-orders-border-strong bg-orders-surface px-2 shadow-orders focus-within:border-orders-primary focus-within:ring-2 focus-within:ring-orders-primary-ring sm:max-w-md">
      <Icon name="search" className="h-3.5 w-3.5 text-orders-text-subtle" />
      <div className="relative" ref={searchDropdownRef}>
        <button type="button" onClick={() => p.setSearchDropdownOpen((prev) => !prev)} aria-haspopup="menu" aria-expanded={p.searchDropdownOpen} className="flex items-center gap-1 rounded bg-orders-primary-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-orders-primary-ink cursor-pointer">
          {fieldLabel}<Icon name="chevronDown" className="h-2.5 w-2.5" />
        </button>
        {p.searchDropdownOpen && (
          <div role="menu" className="absolute left-0 top-full z-30 mt-1 min-w-40 rounded-xl border border-orders-border bg-orders-surface py-1 shadow-orders-md">
            <MenuOption selected={p.searchField === ''} onClick={() => { p.setSearchField(''); p.setSearchDropdownOpen(false); p.setPagination((prev) => ({ ...prev, page: 1 })); }}>All fields</MenuOption>
            {fields.map((f) => (
              <MenuOption key={f.value} selected={p.searchField === f.value} onClick={() => { p.setSearchField(f.value); p.setSearchDropdownOpen(false); p.setPagination((prev) => ({ ...prev, page: 1 })); }}>{f.label}</MenuOption>
            ))}
          </div>
        )}
      </div>
      <input
        value={p.searchInput}
        onChange={(e) => p.setSearchInput(e.target.value)}
        placeholder={p.caps.barcodeSearch ? 'Scan barcode or search order, customer, product…' : 'Search order, customer, address, product…'}
        aria-label="Search orders"
        className="min-w-0 flex-1 bg-transparent text-[11.5px] text-orders-text outline-none placeholder:text-orders-text-subtle"
      />
      {p.searchInput && (
        <button type="button" aria-label="Clear search" onClick={() => p.setSearchInput('')} className="text-orders-text-subtle hover:text-orders-text cursor-pointer"><Icon name="close" className="h-3 w-3" /></button>
      )}
    </div>
  );
}

function SyncControls({ p }: { p: OrdersPageBundle }) {
  const { syncStoreDropdownRef } = p;
  const busy = p.syncing || p.loading || p.syncActive;
  return (
    <>
      <span className="hidden whitespace-nowrap text-[10px] text-orders-text-subtle xl:inline">{p.syncMessage}</span>
      <div className="relative flex" ref={syncStoreDropdownRef}>
        <button type="button" onClick={p.handleSync} disabled={busy} className="flex h-8 items-center gap-1.5 rounded-l-lg border border-r-0 border-orders-border-strong bg-orders-surface px-2.5 text-[11px] font-semibold text-orders-text-body shadow-orders hover:bg-orders-surface-muted disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
          <Icon name="refresh" className={`h-3.5 w-3.5 ${p.syncing || p.syncActive ? 'animate-spin' : ''}`} />
          {p.syncActive ? 'Syncing…' : p.syncing ? 'Queueing…' : 'Sync'}
        </button>
        <button type="button" aria-label="Choose stores to sync" onClick={() => p.setSyncStoreDropdownOpen((prev) => !prev)} disabled={busy} className="flex h-8 items-center rounded-r-lg border border-orders-border-strong bg-orders-surface px-1.5 text-orders-text-body shadow-orders hover:bg-orders-surface-muted disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
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
        <button type="button" onClick={p.handleClearFilters} className="flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] text-orders-text-subtle hover:bg-orders-danger-soft hover:text-orders-danger cursor-pointer">
          <Icon name="close" className="h-3 w-3" />Clear filters
        </button>
      )}
      <span className="flex-1" />
      {caps.sync && <SyncControls p={p} />}
      <button type="button" onClick={p.handleRefresh} disabled={p.syncing} title={p.syncRefreshNeeded ? 'A sync finished: refresh to see the changes' : 'Reload the list'} className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold shadow-orders disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${p.syncRefreshNeeded ? 'border-orders-warning-border bg-orders-warning-soft text-orders-warning-ink hover:brightness-95' : 'border-orders-border-strong bg-orders-surface text-orders-text-body hover:bg-orders-surface-muted'}`}>
        <Icon name="refresh" className="h-3.5 w-3.5" />Refresh
      </button>
    </div>
  );
}
