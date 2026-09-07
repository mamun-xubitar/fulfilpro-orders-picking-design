'use client';

import { useEffect, useRef, useState } from 'react';
import { FieldLabel } from './ProductFieldRows';
import { Close } from './icons';

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
  const containerRef = useRef<HTMLDivElement>(null);
  // Guards against an older, slower request's response landing after a newer one and
  // overwriting it — without this, fast typing can flash stale results back in.
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
    <div className="min-w-0" ref={containerRef}>
      <FieldLabel>Collections</FieldLabel>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex min-h-[38px] w-full flex-wrap items-center gap-1 rounded-lg border border-gray-300 px-2 py-1.5 text-left text-[13px] outline-none hover:bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
        >
          {value.length === 0 && <span className="px-1 text-gray-400">Select collections…</span>}
          {value.map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700"
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

        {open && (
          <div className="absolute z-30 top-full mt-1 left-0 w-full sm:w-[20rem] max-w-[90vw] max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false);
              }}
              placeholder="Search collections…"
              className="w-full border-b border-gray-100 px-3 py-2 text-sm outline-none"
            />
            {loading && <div className="px-3 py-2 text-xs text-gray-400">Loading…</div>}
            {!loading &&
              results.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
                  <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggle(c)} className="rounded border-gray-300 text-blue-600" />
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
                className="flex w-full items-center gap-1.5 border-t border-dashed border-gray-200 px-3 py-2 text-left text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60 cursor-pointer"
              >
                <span aria-hidden>+</span>
                <span className="truncate">
                  {creating ? 'Creating…' : <>Add “<span className="font-bold">{query.trim()}</span>” as new collection</>}
                </span>
              </button>
            )}
            {!loading && results.length === 0 && !query.trim() && <div className="px-3 py-2 text-xs text-gray-400">No collections yet</div>}
            {createError && <div className="px-3 py-2 text-xs text-red-600">{createError}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
