'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FieldLabel } from './ProductFieldRows';
import { Close } from './icons';
import { useAnchoredDropdown } from './hooks/useAnchoredDropdown';

type StoreCollection = { id: string; title: string };
type ApiResponse<T> = { success: boolean; message: string; data: T };

type CollectionsPickerProps = {
  storeId: string;
  value: StoreCollection[];
  onChange: (value: StoreCollection[]) => void;
};

/**
 * Searchable multi-select over one store's manual collections — the other half of Shopify's
 * "Product organization" alongside Type/Category. Automated (rule-based) collections are never
 * offered (`searchStoreCollections` already excludes them server-side), since Shopify rejects
 * direct membership writes on those. Selected collections render as removable chips on the
 * trigger, and the dropdown re-searches as the admin types (debounced, click-outside-closed —
 * same mechanics as CategoryPicker).
 */
export default function CollectionsPicker({ storeId, value, onChange }: CollectionsPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StoreCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Fixed 320px menu, measured-height above-placement, auto-close off-screen — shared hook.
  const position = useAnchoredDropdown({ anchorRef, dropdownRef, open, onClose: () => setOpen(false), width: 320, maxHeight: 288 });
  // Guards against an older, slower request's response landing after a newer one and
  // overwriting it — without this, fast typing can flash stale results back in.
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!open || !storeId) return;
    const timeout = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const params = new URLSearchParams({ storeId });
        if (query.trim()) params.set('q', query.trim());
        const res = await fetch(`/api/inventory/store-collections?${params.toString()}`);
        const json = (await res.json()) as ApiResponse<{ collections: StoreCollection[] }>;
        if (requestId !== requestIdRef.current) return; // a newer request already resolved
        if (res.ok && json.success) setResults(json.data.collections);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, open, storeId]);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const selectedIds = new Set(value.map((c) => c.id));
  const toggle = (c: StoreCollection) => {
    onChange(selectedIds.has(c.id) ? value.filter((v) => v.id !== c.id) : [...value, c]);
  };
  const remove = (id: string) => onChange(value.filter((v) => v.id !== id));

  /** Explicit Add when nothing matches — creates the collection on this store, then adds the
   * new collection to the existing selection immediately. */
  const createAndSelect = async (title: string) => {
    const clean = title.trim();
    if (!clean || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const params = new URLSearchParams({ storeId });
      const res = await fetch(`/api/inventory/store-collections?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: clean }),
      });
      const json = (await res.json()) as ApiResponse<{ collection: StoreCollection }>;
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to create collection');
      onChange([...value, json.data.collection]);
      setQuery('');
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create collection');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-w-0">
      <FieldLabel>Collections</FieldLabel>
      <div className="relative">
        <button
          ref={anchorRef}
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex min-h-[24px] w-full flex-wrap items-center gap-[4px] rounded-[7px] border border-gray-300 px-[6px] py-[3px] text-left text-[11px] leading-none outline-none hover:bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
        >
          {value.length === 0 && <span className="px-[2px] text-gray-400">Select collections…</span>}
          {value.map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-[3px] rounded-full border border-gray-200 bg-gray-50 px-[5px] py-[1px] text-[9px] font-semibold leading-none text-gray-700"
            >
              {c.title}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(c.id);
                }}
                aria-label={`Remove ${c.title}`}
                className="text-gray-400 hover:text-red-600"
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
            className="z-[70] max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          >
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false);
              }}
              placeholder="Search collections…"
              className="w-full border-b border-gray-100 px-2 py-1.5 text-[11px] outline-none"
            />
            {loading && <div className="px-2 py-1 text-[11px] text-gray-400">Loading…</div>}
            {!loading &&
              results.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 px-2 py-1 text-[11px] leading-none hover:bg-gray-50">
                  <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggle(c)} className="h-3 w-3 rounded border-gray-300 text-blue-600" />
                  <span className="truncate text-gray-900">{c.title}</span>
                </label>
              ))}
            {!loading && results.length === 0 && query.trim() && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  void createAndSelect(query);
                }}
                disabled={creating}
                className="flex w-full items-center gap-1.5 border-t border-dashed border-gray-200 px-2 py-1 text-left text-[11px] font-semibold leading-none text-blue-700 hover:bg-blue-50 disabled:opacity-60 cursor-pointer"
              >
                <span aria-hidden>+</span>
                <span className="truncate">
                  {creating ? 'Creating…' : <>Add “<span className="font-bold">{query.trim()}</span>” as new collection</>}
                </span>
              </button>
            )}
            {!loading && results.length === 0 && !query.trim() && <div className="px-2 py-1 text-[11px] text-gray-400">No collections yet</div>}
            {createError && <div className="px-2 py-1 text-[10px] leading-tight text-red-600">{createError}</div>}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
