'use client';

import { useEffect, useRef, useState } from 'react';
import { FieldLabel } from './ProductFieldRows';
import TaxonomyAddButton from './TaxonomyAddButton';

type ApiResponse<T> = { success: boolean; message: string; data: T };
type OptionsData = { options?: string[]; productTypes?: string[] };

type ProductTypePickerProps = {
  storeId: string;
  value: string;
  onChange: (value: string) => void;
};

/**
 * Shopify's own "Type" field on Product organization has no fixed vocabulary — any text is
 * valid — but its combobox suggests types already used on the store. Mirrors that: a free-text
 * input that also opens a suggestion list drawn live from this Shopify store's product types,
 * debounced and click-outside-closed the same way as CategoryPicker. Picking a suggestion,
 * typing a new value, or hitting the explicit Add button all commit — the committed value is
 * what's published via `productSet`.
 */
export default function ProductTypePicker({ storeId, value, onChange }: ProductTypePickerProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Guards against an older, slower request's response overwriting a newer one when responses
  // arrive out of order — without this, fast typing could flash stale suggestions back in after
  // the current ones already landed, which reads as the dropdown "re-rendering" on its own.
  const requestIdRef = useRef(0);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (!open || !storeId) return;
    const timeout = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const params = new URLSearchParams({ storeId });
        if (value.trim()) params.set('q', value.trim());
        const res = await fetch(`/api/inventory/store-product-types?${params.toString()}`);
        const json = (await res.json()) as ApiResponse<OptionsData>;
        if (requestId !== requestIdRef.current) return; // a newer request already resolved
        if (res.ok && json.success) setSuggestions(json.data.options ?? json.data.productTypes ?? []);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [value, open, storeId]);

  return (
    <div className="min-w-0" ref={containerRef}>
      <FieldLabel>Type</FieldLabel>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="e.g. Snowboard"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
        />

        {open && (
          <div className="absolute z-30 top-full mt-1 left-0 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {loading && <div className="px-3 py-2 text-xs text-gray-400">Loading…</div>}
            {!loading &&
              suggestions.map((type) => (
                <button
                  key={type}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(type);
                    setOpen(false);
                  }}
                  className="block w-full truncate px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 cursor-pointer"
                >
                  {type}
                </button>
              ))}
            {!loading && <TaxonomyAddButton query={value} options={suggestions} label="type" onAdd={(v) => { onChange(v); setOpen(false); }} />}
          </div>
        )}
      </div>
    </div>
  );
}
