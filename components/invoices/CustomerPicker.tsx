'use client';

import { useEffect, useRef, useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { INPUT } from './fieldStyles';

type CustomerRow = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
};

export type PickedCustomer = { id: string; source: 'system' | 'shopify'; name: string; company: string | null; address: string; country: string | null };

type Result = PickedCustomer & { email: string | null };

const toResult = (row: CustomerRow, source: 'system' | 'shopify'): Result => ({
  id: row.id,
  source,
  name: row.name,
  company: row.company,
  email: row.email,
  country: row.country,
  address: [row.address, row.address2, [row.city, row.state, row.zip].filter(Boolean).join(' '), row.country].filter(Boolean).join('\n'),
});

type CustomerPickerProps = {
  storeId: string;
  selectedLabel: string;
  disabled?: boolean;
  onPick: (customer: PickedCustomer) => void;
};

/** Finds a system or Shopify customer to fill the invoice's bill-to. Typing the fields by hand still works. */
export default function CustomerPicker({ storeId, selectedLabel, disabled, onPick }: CustomerPickerProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const { searchInput, setSearchInput, search } = useDebouncedSearch('', 300);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const systemReq = useRequest<{ customers: CustomerRow[] }>();
  const shopifyReq = useRequest<{ customers: CustomerRow[] }>();
  const { request: requestSystem } = systemReq;
  const { request: requestShopify } = shopifyReq;

  useEffect(() => {
    if (!open) return;
    let current = true;
    const merged: { system: Result[]; shopify: Result[] } = { system: [], shopify: [] };
    const publish = () => current && setResults([...merged.system, ...merged.shopify]);
    void requestSystem({
      url: '/api/customers',
      method: 'GET',
      showToast: false,
      data: { source: 'system', search, pageSize: 8, sort: 'name', dir: 'asc' },
      onSuccess: ({ data }) => {
        merged.system = data.customers.map((row) => toResult(row, 'system'));
        publish();
      },
    });
    if (storeId) {
      void requestShopify({
        url: '/api/customers',
        method: 'GET',
        showToast: false,
        data: { source: 'shopify', search, storeId, pageSize: 8, sort: 'name', dir: 'asc' },
        onSuccess: ({ data }) => {
          merged.shopify = data.customers.map((row) => toResult(row, 'shopify'));
          publish();
        },
      });
    }
    return () => {
      current = false;
    };
  }, [open, search, storeId, requestSystem, requestShopify]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const loading = systemReq.loading || shopifyReq.loading;

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        className={INPUT}
        disabled={disabled}
        value={open ? searchInput : selectedLabel}
        placeholder="Search customers (system or this store's Shopify customers)…"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setSearchInput(event.target.value);
          setOpen(true);
        }}
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {loading && results.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">Searching…</li>}
          {!loading && results.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">No customers found — type the details below instead.</li>}
          {results.map((result) => (
            <li key={`${result.source}-${result.id}`}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  onPick(result);
                  setOpen(false);
                  setSearchInput('');
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-gray-900">{result.company || result.name}</span>
                  <span className="block truncate text-xs text-gray-500">{[result.company ? result.name : null, result.email].filter(Boolean).join(' · ')}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${result.source === 'system' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  {result.source === 'system' ? 'System' : 'Shopify'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
