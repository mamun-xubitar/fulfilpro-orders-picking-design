'use client';

import { useEffect, useRef, useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { INPUT } from './fieldStyles';

type AddressFields = {
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
};

/** A customer as returned by `/api/customers` (list or single), on either tab. */
export type CustomerApiRow = AddressFields & {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  currencyCode?: string;
  taxRegion?: string;
  creditLimit?: number | null;
  balance: number;
  contacts?: Array<{ name: string; email: string | null }>;
  addresses?: Array<AddressFields & { label: string | null; name: string; isDefault: boolean }>;
};

export type ShipToOption = { label: string; name: string; address: string };

export type PickedCustomer = {
  id: string;
  source: 'system' | 'shopify';
  name: string;
  company: string | null;
  email: string | null;
  /** Billing address as invoice text. */
  address: string;
  country: string | null;
  currencyCode: string | null;
  taxRegion: string | null;
  creditLimit: number | null;
  balance: number;
  /** Customer email plus contact emails, for emailing invoices. */
  emails: string[];
  /** Shipping addresses, default first. */
  shipTo: ShipToOption[];
};

const joinAddress = (row: AddressFields) =>
  [row.address, row.address2, [row.city, row.state, row.zip].filter(Boolean).join(' '), row.country].filter(Boolean).join('\n');

export function pickedFromRow(row: CustomerApiRow, source: 'system' | 'shopify'): PickedCustomer {
  const addresses = [...(row.addresses ?? [])].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  return {
    id: row.id,
    source,
    name: row.name,
    company: row.company,
    email: row.email,
    address: joinAddress(row),
    country: row.country,
    currencyCode: row.currencyCode ?? null,
    taxRegion: row.taxRegion ?? null,
    creditLimit: row.creditLimit ?? null,
    balance: row.balance ?? 0,
    emails: [...new Set([row.email, ...(row.contacts ?? []).map((contact) => contact.email)].filter((email): email is string => Boolean(email)))],
    shipTo: addresses.map((address) => ({ label: address.label || address.name, name: address.name, address: joinAddress(address) })),
  };
}

type CustomerPickerProps = {
  storeId: string;
  selectedLabel: string;
  disabled?: boolean;
  onPick: (customer: PickedCustomer) => void;
};

/** Finds a system or Shopify customer to fill the invoice's bill-to. Typing the fields by hand still works. */
export default function CustomerPicker({ storeId, selectedLabel, disabled, onPick }: CustomerPickerProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PickedCustomer[]>([]);
  const { searchInput, setSearchInput, search } = useDebouncedSearch('', 300);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const systemReq = useRequest<{ customers: CustomerApiRow[] }>();
  const shopifyReq = useRequest<{ customers: CustomerApiRow[] }>();
  const { request: requestSystem } = systemReq;
  const { request: requestShopify } = shopifyReq;

  useEffect(() => {
    if (!open) return;
    let current = true;
    const merged: { system: PickedCustomer[]; shopify: PickedCustomer[] } = { system: [], shopify: [] };
    const publish = () => current && setResults([...merged.system, ...merged.shopify]);
    void requestSystem({
      url: '/api/customers',
      method: 'GET',
      showToast: false,
      data: { source: 'system', search, pageSize: 8, sort: 'name', dir: 'asc' },
      onSuccess: ({ data }) => {
        merged.system = data.customers.map((row) => pickedFromRow(row, 'system'));
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
          merged.shopify = data.customers.map((row) => pickedFromRow(row, 'shopify'));
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
