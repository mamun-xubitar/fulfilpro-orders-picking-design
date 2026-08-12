'use client';

import { useEffect, useRef, useState } from 'react';
import type { VariantSearchResult } from './types';
import { formatShippingMoney, groupVariantResults } from './utils';

const SearchIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
  </svg>
);

const CheckIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const CloseIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

type Props = {
  query: string;
  results: VariantSearchResult[];
  searching: boolean;
  selectedVariant: VariantSearchResult | null;
  currencyCode: string | null;
  setQuery: (query: string) => void;
  selectVariant: (variant: VariantSearchResult | null) => void;
};

const variantLabel = (variant: VariantSearchResult) => variant.variantTitle || 'Default';

export default function VariantPicker({
  query,
  results,
  searching,
  selectedVariant,
  currencyCode,
  setQuery,
  selectVariant,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const groups = groupVariantResults(results);

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search by product title or SKU..."
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
        />

        {open && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {searching ? (
              <p className="px-3 py-3 text-sm text-gray-400">Searching...</p>
            ) : groups.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-400">{query ? 'No products found.' : 'Start typing to search products.'}</p>
            ) : (
              groups.map((group) => (
                <div key={group.productShopifyId} className="border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center gap-3 bg-gray-50 px-3 py-2">
                    {group.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={group.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded bg-gray-200" />
                    )}
                    <p className="truncate text-sm font-semibold text-gray-800">{group.productTitle}</p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {group.variants.map((variant) => (
                      <button
                        key={variant.variantShopifyId}
                        type="button"
                        onClick={() => {
                          selectVariant(variant);
                          setOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 py-2 pl-6 pr-3 text-left cursor-pointer hover:bg-gray-50 ${selectedVariant?.variantShopifyId === variant.variantShopifyId ? 'bg-blue-50' : ''}`}
                      >
                        {variant.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={variant.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                        ) : (
                          <div className="h-8 w-8 shrink-0 rounded bg-gray-100" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-gray-800">{variantLabel(variant)}</p>
                          <p className="truncate text-xs text-gray-500">
                            {variant.sku || 'No SKU'} · {variant.inventoryQuantity} on hand
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-medium text-gray-700">
                          {formatShippingMoney(variant.price, currencyCode)}
                        </span>
                        {selectedVariant?.variantShopifyId === variant.variantShopifyId && (
                          <CheckIcon className="h-4 w-4 shrink-0 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {selectedVariant && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          {selectedVariant.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selectedVariant.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded bg-white" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-800">{selectedVariant.productTitle}</p>
            <p className="truncate text-xs text-gray-500">
              {variantLabel(selectedVariant)} · {selectedVariant.sku || 'No SKU'} · {selectedVariant.inventoryQuantity} on hand
            </p>
          </div>
          <span className="shrink-0 text-sm font-medium text-gray-700">
            {formatShippingMoney(selectedVariant.price, currencyCode)}
          </span>
          <button
            type="button"
            onClick={() => selectVariant(null)}
            className="shrink-0 rounded p-1 text-gray-400 hover:bg-white hover:text-gray-600 cursor-pointer"
            aria-label="Clear selected product"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
