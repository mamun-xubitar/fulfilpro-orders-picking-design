'use client';

import { useEffect, useRef, useState } from 'react';
import type { ApiResponse, TaxonomyCategory } from './types';

type CategoryPickerProps = {
  storeId: string;
  value: { id: string; name: string } | null;
  onChange: (category: { id: string; name: string } | null) => void;
};

export default function CategoryPicker({ storeId, value, onChange }: CategoryPickerProps) {
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
        const params = new URLSearchParams({ storeId, q: query });
        const res = await fetch(`/api/inventory/taxonomy?${params.toString()}`);
        const json = (await res.json()) as ApiResponse<{ categories: TaxonomyCategory[] }>;
        if (res.ok && json.success) setResults(json.data.categories);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, open, storeId]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 text-sm text-left hover:bg-gray-50 cursor-pointer"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>{value?.name ?? 'Select category…'}</span>
        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 top-full mt-1 left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-64 overflow-y-auto">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories…"
            className="w-full px-3 py-2 text-sm border-b border-gray-100 outline-none"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 cursor-pointer"
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
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
              >
                <div className="text-gray-900">{category.name}</div>
                <div className="text-xs text-gray-400 truncate">{category.fullName}</div>
              </button>
            ))}
          {!loading && results.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">No matches</div>}
        </div>
      )}
    </div>
  );
}
