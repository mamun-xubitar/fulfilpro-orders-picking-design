'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FieldLabel } from './ProductFieldRows';
import TaxonomyAddButton from './TaxonomyAddButton';
import { useAnchoredDropdown } from './hooks/useAnchoredDropdown';

type ApiResponse<T> = { success: boolean; message: string; data: T };

type VendorPickerProps = {
  storeId: string;
  value: string;
  onChange: (value: string) => void;
};

/**
 * Searchable Vendor dropdown sourced live from the Shopify store's product vendors — the same
 * combobox mechanics as ProductTypePicker (debounced, click-outside-closed, race-guarded).
 * Shopify vendors are free-form: picking a suggestion, typing a new value, or hitting Add all
 * commit, and the committed value is what `productSet` publishes as `vendor`.
 */
export default function VendorPicker({ storeId, value, onChange }: VendorPickerProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const anchorRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Fixed 280px menu, measured-height above-placement, auto-close off-screen — shared hook.
  const position = useAnchoredDropdown({ anchorRef, dropdownRef, open, onClose: () => setOpen(false), width: 280, maxHeight: 224 });
  // Guards against an older, slower request's response overwriting a newer one when responses
  // arrive out of order.
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!open || !storeId) return;
    const timeout = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const params = new URLSearchParams({ storeId });
        if (value.trim()) params.set('q', value.trim());
        const res = await fetch(`/api/inventory/store-vendors?${params.toString()}`);
        const json = (await res.json()) as ApiResponse<{ options: string[] }>;
        if (requestId !== requestIdRef.current) return; // a newer request already resolved
        if (res.ok && json.success) setSuggestions(json.data.options ?? []);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [value, open, storeId]);

  return (
    <div className="min-w-0">
      <FieldLabel>Brand (Vendor)</FieldLabel>
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
          placeholder="e.g. Flex Kindy"
          className="h-[24px] w-full rounded-[7px] border border-gray-300 px-[6px] text-[11px] leading-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400"
        />

        {open && position && typeof document !== 'undefined' && createPortal(
          <div
            ref={dropdownRef}
            style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
            className="z-[70] max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          >
            {loading && <div className="px-2 py-1 text-[11px] text-gray-400">Loading…</div>}
            {!loading &&
              suggestions.map((vendor) => (
                <button
                  key={vendor}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(vendor);
                    setOpen(false);
                  }}
                  className="block w-full truncate px-2 py-1 text-left text-[11px] leading-none text-gray-900 hover:bg-gray-50 cursor-pointer"
                >
                  {vendor}
                </button>
              ))}
            {!loading && <TaxonomyAddButton query={value} options={suggestions} label="vendor" onAdd={(v) => { onChange(v); setOpen(false); }} />}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
