'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FieldLabel } from './ProductFieldRows';
import TaxonomyAddButton from './TaxonomyAddButton';
import { Close } from './icons';
import { useAnchoredDropdown } from './hooks/useAnchoredDropdown';

type ApiResponse<T> = { success: boolean; message: string; data: T };

type TagsPickerProps = {
  storeId: string;
  value: string[];
  onChange: (value: string[]) => void;
};

/**
 * Searchable Tags multi-select sourced live from the Shopify store's product tags — chip
 * trigger with removable selections plus a debounced search dropdown, same mechanics as
 * CollectionsPicker. No exact match offers an explicit Add button: the new tag is appended to
 * the existing selection immediately and published via `productSet` on Save.
 */
export default function TagsPicker({ storeId, value, onChange }: TagsPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Fixed 320px menu, measured-height above-placement, auto-close off-screen — shared hook.
  const position = useAnchoredDropdown({ anchorRef, dropdownRef, open, onClose: () => setOpen(false), width: 320, maxHeight: 288 });
  // Guards against an older, slower request's response landing after a newer one and
  // overwriting it.
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!open || !storeId) return;
    const timeout = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const params = new URLSearchParams({ storeId });
        if (query.trim()) params.set('q', query.trim());
        const res = await fetch(`/api/inventory/store-tags?${params.toString()}`);
        const json = (await res.json()) as ApiResponse<{ options: string[] }>;
        if (requestId !== requestIdRef.current) return; // a newer request already resolved
        if (res.ok && json.success) setResults(json.data.options ?? []);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, open, storeId]);

  const selectedKeys = new Set(value.map((t) => t.trim().toLowerCase()));
  const toggle = (tag: string) => {
    const key = tag.trim().toLowerCase();
    onChange(selectedKeys.has(key) ? value.filter((v) => v.trim().toLowerCase() !== key) : [...value, tag.trim()]);
  };
  const remove = (tag: string) => onChange(value.filter((v) => v !== tag));
  const addNew = (tag: string) => {
    onChange([...value, tag]);
    setQuery('');
  };

  return (
    <div className="min-w-0">
      <FieldLabel>Tags</FieldLabel>
      <div className="relative">
        <button
          ref={anchorRef}
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex min-h-[24px] w-full flex-wrap items-center gap-[4px] rounded-[7px] border border-inventory-border-strong px-[6px] py-[3px] text-left text-[11px] leading-none outline-none hover:bg-inventory-surface-hover focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer"
        >
          {value.length === 0 && <span className="px-[2px] text-inventory-text-subtle">Select tags…</span>}
          {value.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-[3px] rounded-full border border-inventory-border bg-inventory-surface-muted px-[5px] py-[1px] text-[9px] font-semibold leading-none text-inventory-text-muted"
            >
              {tag}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(tag);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    remove(tag);
                  }
                }}
                aria-label={`Remove tag ${tag}`}
                className="text-inventory-text-subtle hover:text-inventory-danger-hover"
              >
                <Close className="h-2.5 w-2.5" />
              </span>
            </span>
          ))}
        </button>

        {open && position && typeof document !== 'undefined' && createPortal(
          <div
            ref={dropdownRef}
            style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
            className="z-[70] max-h-72 overflow-y-auto rounded-lg border border-inventory-border bg-inventory-surface py-1 shadow-lg inventory-dropdown-in"
          >
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false);
              }}
              placeholder="Search tags…"
              className="w-full border-b border-inventory-divider px-2 py-1.5 text-[11px] outline-none"
            />
            {loading && <div className="px-2 py-1 text-[11px] text-inventory-text-subtle">Loading…</div>}
            {!loading &&
              results.map((tag) => (
                <label key={tag} className="flex cursor-pointer items-center gap-2 px-2 py-1 text-[11px] leading-none hover:bg-inventory-surface-hover">
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(tag.trim().toLowerCase())}
                    onChange={() => toggle(tag)}
                    className="h-3 w-3 rounded border-inventory-border-strong text-inventory-secondary"
                  />
                  <span className="truncate text-inventory-text">{tag}</span>
                </label>
              ))}
            {!loading && <TaxonomyAddButton query={query} options={results} label="tag" onAdd={addNew} />}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
