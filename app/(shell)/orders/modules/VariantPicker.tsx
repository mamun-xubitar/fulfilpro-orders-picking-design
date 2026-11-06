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
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orders-text-subtle" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search by product title or SKU..."
          className="w-full rounded-lg border border-orders-border-strong py-2 pl-9 pr-3 text-sm"
        />

        {open && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-orders-border bg-orders-surface shadow-lg">
            {searching ? (
              <p className="px-3 py-3 text-sm text-orders-text-subtle">Searching...</p>
            ) : groups.length === 0 ? (
              <p className="px-3 py-3 text-sm text-orders-text-subtle">{query ? 'No products found.' : 'Start typing to search products.'}</p>
            ) : (
              groups.map((group) => (
                <div key={group.productShopifyId} className="border-b border-orders-divider last:border-b-0">
                  <div className="flex items-center gap-3 bg-orders-surface-muted px-3 py-2">
                    {group.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={group.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded bg-gray-200" />
                    )}
                    <p className="truncate text-sm font-semibold text-orders-text">{group.productTitle}</p>
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
                        className={`flex w-full items-center gap-3 py-2 pl-6 pr-3 text-left cursor-pointer hover:bg-orders-surface-muted ${selectedVariant?.variantShopifyId === variant.variantShopifyId ? 'bg-orders-primary-soft' : ''}`}
                      >
                        {variant.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={variant.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                        ) : (
                          <div className="h-8 w-8 shrink-0 rounded bg-orders-canvas" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-orders-text">{variantLabel(variant)}</p>
                          <p className="truncate text-xs text-orders-text-subtle">
                            {variant.sku || 'No SKU'} · {variant.inventoryQuantity} on hand
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-medium text-orders-text-body">
                          {formatShippingMoney(variant.price, currencyCode)}
                        </span>
                        {selectedVariant?.variantShopifyId === variant.variantShopifyId && (
                          <CheckIcon className="h-4 w-4 shrink-0 text-orders-primary" />
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
        <div className="flex items-center gap-3 rounded-lg border border-orders-primary-ring bg-orders-primary-soft px-3 py-2">
          {selectedVariant.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selectedVariant.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded bg-orders-surface" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-orders-text">{selectedVariant.productTitle}</p>
            <p className="truncate text-xs text-orders-text-subtle">
              {variantLabel(selectedVariant)} · {selectedVariant.sku || 'No SKU'} · {selectedVariant.inventoryQuantity} on hand
            </p>
          </div>
          <span className="shrink-0 text-sm font-medium text-orders-text-body">
            {formatShippingMoney(selectedVariant.price, currencyCode)}
          </span>
          <button
            type="button"
            onClick={() => selectVariant(null)}
            className="shrink-0 rounded p-1 text-orders-text-subtle hover:bg-orders-surface hover:text-orders-text-muted cursor-pointer"
            aria-label="Clear selected product"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
