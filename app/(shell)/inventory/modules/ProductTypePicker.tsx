'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FieldLabel } from './ProductFieldRows';
import TaxonomyAddButton from './TaxonomyAddButton';
import { useAnchoredDropdown } from './hooks/useAnchoredDropdown';

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
  const anchorRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Fixed 280px menu, measured-height above-placement, auto-close off-screen — shared hook.
  const position = useAnchoredDropdown({ anchorRef, dropdownRef, open, onClose: () => setOpen(false), width: 280, maxHeight: 224 });
  // Guards against an older, slower request's response overwriting a newer one when responses
  // arrive out of order — without this, fast typing could flash stale suggestions back in after
  // the current ones already landed, which reads as the dropdown "re-rendering" on its own.
  const requestIdRef = useRef(0);

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
    <div className="min-w-0">
      <FieldLabel>Type</FieldLabel>
      <div className="relative">
        <input
          ref={anchorRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="e.g. Snowboard"
          className="h-[24px] w-full rounded-[7px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring placeholder:text-inventory-text-subtle"
        />

        {open && position && typeof document !== 'undefined' && createPortal(
          <div
            ref={dropdownRef}
            style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
            className="z-[70] max-h-56 overflow-y-auto rounded-lg border border-inventory-border bg-inventory-surface py-1 shadow-lg inventory-dropdown-in"
          >
            {loading && <div className="px-2 py-1 text-[11px] text-inventory-text-subtle">Loading…</div>}
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
                  className="block w-full truncate px-2 py-1 text-left text-[11px] leading-none text-inventory-text hover:bg-inventory-surface-hover cursor-pointer"
                >
                  {type}
                </button>
              ))}
            {!loading && <TaxonomyAddButton query={value} options={suggestions} label="type" onAdd={(v) => { onChange(v); setOpen(false); }} />}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
