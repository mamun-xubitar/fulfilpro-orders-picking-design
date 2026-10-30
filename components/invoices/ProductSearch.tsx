'use client';

import { useEffect, useRef, useState } from 'react';
import { Search } from '@/components/icons';
import useRequest from '@/hooks/useRequest';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { INPUT } from './fieldStyles';

export type VariantResult = {
  variantShopifyId: string;
  productTitle: string;
  variantTitle: string | null;
  sku: string | null;
  price: number;
  inventoryQuantity: number;
};

/** Finds a product variant in the chosen store's catalogue, by product name, variant name or SKU. */
export default function ProductSearch({ storeId, disabled, onPick }: { storeId: string; disabled?: boolean; onPick: (variant: VariantResult) => void }) {
  const [open, setOpen] = useState(false);
  // Results are tagged with their store so a store change never shows another catalogue's products.
  const [found, setFound] = useState<{ storeId: string; rows: VariantResult[] }>({ storeId: '', rows: [] });
  const results = found.storeId === storeId ? found.rows : [];
  const { searchInput, setSearchInput, search } = useDebouncedSearch('', 300);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { request, loading } = useRequest<VariantResult[]>();

  useEffect(() => {
    if (!open || !storeId || !search) return;
    void request({
      url: '/api/invoices/variant-search',
      method: 'GET',
      showToast: false,
      data: { storeId, q: search },
      onSuccess: ({ data }) => setFound({ storeId, rows: data }),
    });
  }, [open, storeId, search, request]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        className={`${INPUT} pl-9`}
        disabled={disabled || !storeId}
        value={searchInput}
        placeholder={storeId ? 'Find a product by name, size or SKU…' : 'Choose a store to search its products'}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setSearchInput(event.target.value);
          setOpen(true);
        }}
      />
      {open && search && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {loading && results.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">Searching…</li>}
          {!loading && results.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">No products found — add a blank line to type it in.</li>}
          {results.map((variant) => (
            <li key={variant.variantShopifyId}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  onPick(variant);
                  setOpen(false);
                  setSearchInput('');
                  setFound({ storeId: '', rows: [] });
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-gray-900">{variant.productTitle}</span>
                  <span className="block truncate text-xs text-gray-500">{[variant.variantTitle, variant.sku].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="shrink-0 text-sm tabular-nums text-gray-700">{variant.price.toFixed(2)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
