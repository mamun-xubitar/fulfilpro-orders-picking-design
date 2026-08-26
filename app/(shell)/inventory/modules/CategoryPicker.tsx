'use client';

import { useEffect, useRef, useState } from 'react';
import { FieldLabel } from './ProductFieldRows';

type TaxonomyCategory = { id: string; name: string; fullName: string; isLeaf: boolean };
type ApiResponse<T> = { success: boolean; message: string; data: T };

type CategoryPickerProps = {
  value: { id: string | null; name: string };
  onChange: (category: { id: string | null; name: string }) => void;
};

/** Searches the live Shopify taxonomy — the source of truth for every store's category picker. */
export default function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<TaxonomyCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query });
        const res = await fetch(`/api/inventory/taxonomy?${params.toString()}`);
        const json = (await res.json()) as ApiResponse<{ categories: TaxonomyCategory[] }>;
        if (res.ok && json.success) setResults(json.data.categories);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, open]);

  return (
    <div className="min-w-0" ref={containerRef}>
      <FieldLabel>Category</FieldLabel>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-lg border border-gray-300 px-2.5 py-2 text-left text-[13px] outline-none hover:bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
        >
          <span className={`truncate ${value.name ? 'text-gray-900' : 'text-gray-400'}`}>{value.name || 'Select category…'}</span>
        </button>

        {open && (
          <div className="absolute z-30 top-full mt-1 left-0 w-full max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search categories…"
              className="w-full border-b border-gray-100 px-3 py-2 text-sm outline-none"
            />
            {value.name && (
              <button
                type="button"
                onClick={() => {
                  onChange({ id: null, name: '' });
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 cursor-pointer"
              >
                Clear category
              </button>
            )}
            {loading && <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>}
            {!loading &&
              results.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    onChange({ id: category.id, name: category.name });
                    setOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
                >
                  <div className="text-gray-900">{category.name}</div>
                  <div className="truncate text-xs text-gray-400">{category.fullName}</div>
                </button>
              ))}
            {!loading && results.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">No matches</div>}
          </div>
        )}
      </div>
    </div>
  );
}
