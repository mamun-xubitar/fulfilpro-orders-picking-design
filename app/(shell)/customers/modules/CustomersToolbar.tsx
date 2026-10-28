'use client';

import { GitMerge, Plus, RefreshCw, Search } from '@/components/icons';
import type { BillingStore } from '@/hooks/useStoreOptions';
import type { CustomerSource } from './types';

type CustomersToolbarProps = {
  source: CustomerSource;
  onSourceChange: (source: CustomerSource) => void;
  searchInput: string;
  onSearchChange: (value: string) => void;
  stores: BillingStore[];
  storeId: string;
  onStoreChange: (value: string) => void;
  canWrite: boolean;
  isAdmin: boolean;
  selectedCount: number;
  syncing: boolean;
  onNew: () => void;
  onMerge: () => void;
  onClearSelection: () => void;
  onSync: () => void;
};

const TABS: Array<{ id: CustomerSource; label: string }> = [
  { id: 'system', label: 'System customers' },
  { id: 'shopify', label: 'Shopify customers' },
];

const BTN = 'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60';

export default function CustomersToolbar(props: CustomersToolbarProps) {
  const { source, selectedCount, canWrite } = props;
  const mergeable = source === 'system' && selectedCount >= 2;

  return (
    <div className="mb-4 space-y-3">
      <div className="flex gap-1 border-b border-gray-200" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={source === tab.id}
            onClick={() => props.onSourceChange(tab.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold cursor-pointer ${source === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={props.searchInput}
            onChange={(event) => props.onSearchChange(event.target.value)}
            placeholder="Search name, company, email, phone, city…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {source === 'shopify' && (
          <select
            value={props.storeId}
            onChange={(event) => props.onStoreChange(event.target.value)}
            aria-label="Filter by store"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All stores</option>
            {props.stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
          </select>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {source === 'system' && selectedCount > 0 && (
            <>
              <span className="text-xs text-gray-500">{selectedCount} selected</span>
              <button type="button" onClick={props.onClearSelection} className="text-xs font-semibold text-gray-500 hover:text-gray-800 cursor-pointer">Clear</button>
            </>
          )}
          {canWrite && mergeable && (
            <button type="button" onClick={props.onMerge} className={`${BTN} bg-amber-500 text-white hover:bg-amber-600`}>
              <GitMerge className="h-4 w-4" /> Merge ({selectedCount})
            </button>
          )}
          {source === 'shopify' && props.isAdmin && (
            <button type="button" onClick={props.onSync} disabled={props.syncing} className={`${BTN} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}>
              <RefreshCw className={`h-4 w-4 ${props.syncing ? 'animate-spin' : ''}`} /> Sync from Shopify
            </button>
          )}
          {canWrite && (
            <button type="button" onClick={props.onNew} className={`${BTN} bg-blue-600 text-white hover:bg-blue-700`}>
              <Plus className="h-4 w-4" /> New customer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
