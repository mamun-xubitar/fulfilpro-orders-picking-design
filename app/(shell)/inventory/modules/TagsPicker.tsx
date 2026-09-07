'use client';

import { useEffect, useRef, useState } from 'react';
import { FieldLabel } from './ProductFieldRows';
import TaxonomyAddButton from './TaxonomyAddButton';
import { Close } from './icons';

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
  const containerRef = useRef<HTMLDivElement>(null);
  // Guards against an older, slower request's response landing after a newer one and
  // overwriting it.
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
    <div className="min-w-0" ref={containerRef}>
      <FieldLabel>Tags</FieldLabel>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex min-h-[38px] w-full flex-wrap items-center gap-1 rounded-lg border border-gray-300 px-2 py-1.5 text-left text-[13px] outline-none hover:bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
        >
          {value.length === 0 && <span className="px-1 text-gray-400">Select tags…</span>}
          {value.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700"
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
              placeholder="Search tags…"
              className="w-full border-b border-gray-100 px-3 py-2 text-sm outline-none"
            />
            {loading && <div className="px-3 py-2 text-xs text-gray-400">Loading…</div>}
            {!loading &&
              results.map((tag) => (
                <label key={tag} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(tag.trim().toLowerCase())}
                    onChange={() => toggle(tag)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="truncate text-gray-900">{tag}</span>
                </label>
              ))}
            {!loading && <TaxonomyAddButton query={query} options={results} label="tag" onAdd={addNew} />}
          </div>
        )}
      </div>
    </div>
  );
}
