'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FieldLabel } from './ProductFieldRows';
import { Close, Plus } from './icons';

type SupplierMultiSelectProps = {
  suppliers: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  error?: string;
  /** Opens the Add supplier modal pre-filled with `name` — offered as a row in the dropdown when
   * the search term matches no existing supplier, so a not-found lookup can resolve into a create
   * without leaving the field. */
  onCreateSupplier?: (name: string) => void;
  /** Opens the Add supplier modal with a blank form — rendered as a "+" button beside the trigger. */
  onAddSupplier?: () => void;
};

/**
 * A product's suppliers — a chip trigger plus a checkbox dropdown, same mechanics and classes as
 * TagsPicker/CollectionsPicker so it reads as one family. Prop-driven rather than fetching, since
 * the supplier list is already loaded page-wide. Every linked supplier is equal: there's no
 * default/primary among them.
 */
export default function SupplierMultiSelect({ suppliers, selectedIds, onChange, error, onCreateSupplier, onAddSupplier }: SupplierMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
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

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return suppliers;
    return suppliers.filter((s) => s.name.toLowerCase().includes(term));
  }, [suppliers, query]);

  const selected = selectedIds.map((id) => suppliers.find((s) => s.id === id) ?? { id, name: id });
  const toggle = (id: string) => onChange(selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);
  const remove = (id: string) => onChange(selectedIds.filter((s) => s !== id));
  const trimmedQuery = query.trim();

  return (
    <div className="min-w-0" ref={containerRef}>
      <FieldLabel>Suppliers</FieldLabel>
      <div className="relative flex items-start gap-1.5">
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

        {onAddSupplier && (
          <button
            type="button"
            onClick={onAddSupplier}
            aria-label="Add a new supplier"
            title="Add a new supplier"
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-700 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}

        {open && (
          <div className="absolute z-30 top-full mt-1 left-0 w-full sm:w-[20rem] max-w-[90vw] max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search suppliers…"
              className="w-full border-b border-gray-100 px-3 py-2 text-sm outline-none"
            />
            {suppliers.length === 0 && !trimmedQuery && <div className="px-3 py-2 text-xs text-gray-400">No suppliers yet.</div>}
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
            {results.length === 0 && trimmedQuery && (
              <div className="px-3 py-2 text-xs text-gray-400">No suppliers match “{trimmedQuery}”.</div>
            )}
            {trimmedQuery && onCreateSupplier && (
              <button
                type="button"
                onClick={() => {
                  onCreateSupplier(trimmedQuery);
                  setOpen(false);
                  setQuery('');
                }}
                className="flex w-full items-center gap-1.5 border-t border-gray-100 px-3 py-2 text-left text-sm font-semibold text-blue-600 hover:bg-blue-50 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Create supplier “{trimmedQuery}”
              </button>
            )}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
