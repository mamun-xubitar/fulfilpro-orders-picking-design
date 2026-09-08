'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FieldLabel } from './ProductFieldRows';
import { Close } from './icons';

/** Above this many options the panel grows a search box — below it, searching 3 suppliers is noise. */
const SEARCH_THRESHOLD = 8;

type SupplierMultiSelectProps = {
  suppliers: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  error?: string;
};

/**
 * A product's suppliers — a chip trigger plus a checkbox dropdown, same mechanics and classes as
 * TagsPicker/CollectionsPicker so it reads as one family. Prop-driven rather than fetching, since
 * the supplier list is already loaded page-wide. Every linked supplier is equal: there's no
 * default/primary among them.
 */
export default function SupplierMultiSelect({ suppliers, selectedIds, onChange, error }: SupplierMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    // Escape is bound at the document, not on the search input the way TagsPicker does it — that
    // input is conditional here, so a short list would otherwise have no Escape at all.
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const showSearch = suppliers.length > SEARCH_THRESHOLD;
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return suppliers;
    return suppliers.filter((s) => s.name.toLowerCase().includes(term));
  }, [suppliers, query]);

  const selected = selectedIds.map((id) => suppliers.find((s) => s.id === id) ?? { id, name: id });
  const toggle = (id: string) => onChange(selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);
  const remove = (id: string) => onChange(selectedIds.filter((s) => s !== id));

  return (
    <div className="min-w-0" ref={containerRef}>
      <FieldLabel>Suppliers</FieldLabel>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex min-h-[38px] w-full flex-wrap items-center gap-1 rounded-lg border border-gray-300 px-2 py-1.5 text-left text-[13px] outline-none hover:bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
        >
          {selected.length === 0 && <span className="px-1 text-gray-400">Select suppliers…</span>}
          {selected.map((s) => (
            <span
              key={s.id}
              className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700"
            >
              {s.name}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(s.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    remove(s.id);
                  }
                }}
                aria-label={`Remove supplier ${s.name}`}
                className="text-gray-400 hover:text-red-600"
              >
                <Close className="h-2.5 w-2.5" />
              </span>
            </span>
          ))}
        </button>

        {open && (
          <div className="absolute z-30 top-full mt-1 left-0 w-full sm:w-[20rem] max-w-[90vw] max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {showSearch && (
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search suppliers…"
                className="w-full border-b border-gray-100 px-3 py-2 text-sm outline-none"
              />
            )}
            {suppliers.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">No suppliers yet.</div>}
            {suppliers.length > 0 && results.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">No suppliers match “{query.trim()}”.</div>}
            {results.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(s.id)}
                  onChange={() => toggle(s.id)}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="truncate text-gray-900">{s.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
