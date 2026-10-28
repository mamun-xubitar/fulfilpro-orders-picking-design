'use client';

import { Plus, Search } from '@/components/icons';
import type { BillingStore } from '@/hooks/useStoreOptions';

type InvoicesToolbarProps = {
  searchInput: string;
  onSearchChange: (value: string) => void;
  stores: BillingStore[];
  storeId: string;
  onStoreChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  canWrite: boolean;
  onNew: () => void;
};

const SELECT = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function InvoicesToolbar(props: InvoicesToolbarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-60 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={props.searchInput}
          onChange={(event) => props.onSearchChange(event.target.value)}
          placeholder="Search invoice number or customer…"
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <select value={props.storeId} onChange={(event) => props.onStoreChange(event.target.value)} aria-label="Filter by store" className={SELECT}>
        <option value="">All stores</option>
        {props.stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
      </select>
      <select value={props.status} onChange={(event) => props.onStatusChange(event.target.value)} aria-label="Filter by payment status" className={SELECT}>
        <option value="">All statuses</option>
        <option value="UNPAID">Unpaid</option>
        <option value="PARTIAL">Partially paid</option>
        <option value="PAID">Paid</option>
      </select>
      {props.canWrite && (
        <button type="button" onClick={props.onNew} className="ml-auto flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer">
          <Plus className="h-4 w-4" /> New invoice
        </button>
      )}
    </div>
  );
}
