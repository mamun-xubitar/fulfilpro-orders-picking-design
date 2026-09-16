'use client';

import { Search } from './icons';
import { getSwatch } from './utils';
import type { ProductRecord } from './types';

type ProductSearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  results: ProductRecord[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (id: string) => void;
};

export default function ProductSearchBox({ value, onChange, open, setOpen, results, containerRef, onSelect }: ProductSearchBoxProps) {
  const showPanel = open && value.trim().length > 0;

  return (
    <div ref={containerRef} className="relative min-w-40 flex-1">
      <Search className="pointer-events-none absolute left-[8px] top-1/2 h-3 w-3 -translate-y-1/2 text-inventory-text-subtle" />
      <input
        type="search"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results.length > 0) {
            e.preventDefault();
            onSelect(results[0].id);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder="Search products, SKU, barcode…"
        aria-label="Search products"
        className="h-[24px] w-full rounded-[7px] border border-inventory-border-strong bg-inventory-surface pl-[24px] pr-[8px] text-[11px] leading-none text-inventory-text shadow-sm outline-none placeholder:text-inventory-text-subtle focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
      />

      {showPanel && (
        <div className="absolute left-0 top-full z-30 mt-1 w-full min-w-72 overflow-hidden rounded-xl border border-inventory-border bg-inventory-surface shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-inventory-text-subtle">No products match “{value.trim()}”</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-inventory-surface-hover cursor-pointer"
                  >
                    <SearchThumb product={item} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-inventory-text">{item.name}</span>
                      <span className="block truncate text-[11px] text-inventory-text-subtle">
                        {item.itemNo} · {item.sku} · {item.variants.length} variants
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SearchThumb({ product }: { product: ProductRecord }) {
  const image = product.images[0];
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image.url} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-inventory-border object-cover" />;
  }
  return (
    <span
      className="h-9 w-9 shrink-0 rounded-lg border border-inventory-border"
      style={{ backgroundColor: product.colours[0]?.color ?? getSwatch(product.variants[0]?.colour ?? '') }}
      aria-hidden="true"
    />
  );
}
