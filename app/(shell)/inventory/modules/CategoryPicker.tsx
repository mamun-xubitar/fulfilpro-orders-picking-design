'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FieldLabel } from './ProductFieldRows';

type DropdownPosition = { top: number; left: number; width: number };

type TaxonomyCategory = { id: string; name: string; fullName: string; isLeaf: boolean };
type ApiResponse<T> = { success: boolean; message: string; data: T };

type CategoryPickerProps = {
  /** `name` is the full taxonomy path ("Apparel & Accessories > … > Visors") — what Shopify's
   * product-CSV `Product Category` column needs, not just the leaf. */
  value: { id: string | null; name: string };
  onChange: (category: { id: string | null; name: string }) => void;
};

/**
 * Searches — or browses — the live Shopify taxonomy, the source of truth for every store's
 * category picker. An empty query browses top-level categories with drill-down via a chevron on
 * every non-leaf row; typing a query switches to a flat search across the whole tree. A back
 * button pinned at the top of the dropdown pops one level of the browse path (or leaves search
 * mode) without an extra request.
 */
export default function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState<{ id: string; name: string }[]>([]);
  const [results, setResults] = useState<TaxonomyCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<DropdownPosition | null>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
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

  // Portalled to document.body (fixed position) so the Product details panel's
  // `overflow-y-auto` scroll container can't clip it — same as SupplierMultiSelect.
  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(Math.max(rect.width, 240), window.innerWidth - 16);
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      const below = window.innerHeight - rect.bottom;
      const top = below < 288 && rect.top > below ? Math.max(8, rect.top - 292) : rect.bottom + 4;
      setPosition((prev) => (prev && prev.top === top && prev.left === left && prev.width === width ? prev : { top, left, width }));
    };
    updatePosition();
    const panel = containerRef.current?.closest('section');
    const resizeObserver = panel ? new ResizeObserver(updatePosition) : null;
    if (panel) resizeObserver?.observe(panel);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) {
          params.set('q', query.trim());
        } else if (path.length > 0) {
          params.set('parentId', path[path.length - 1].id);
        }
        const res = await fetch(`/api/inventory/taxonomy?${params.toString()}`);
        const json = (await res.json()) as ApiResponse<{ categories: TaxonomyCategory[] }>;
        if (res.ok && json.success) setResults(json.data.categories);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, path, open]);

  const searching = query.trim().length > 0;
  const showBack = searching || path.length > 0;
  const backLabel = searching ? 'All categories' : path.length > 1 ? path[path.length - 2].name : 'All categories';

  const goBack = () => {
    if (searching) {
      setQuery('');
      return;
    }
    setPath((prev) => prev.slice(0, -1));
  };

  const drillInto = (category: TaxonomyCategory) => {
    setQuery('');
    setPath((prev) => [...prev, { id: category.id, name: category.name }]);
  };

  const select = (category: TaxonomyCategory) => {
    onChange({ id: category.id, name: category.fullName });
    setOpen(false);
  };

  return (
    <div className="min-w-0" ref={containerRef}>
      <FieldLabel>Category</FieldLabel>
      <div className="relative">
        <button
          ref={anchorRef}
          type="button"
          onClick={() => {
            setPath([]);
            setQuery('');
            setOpen((prev) => !prev);
          }}
          className="flex h-[24px] w-full items-center justify-between rounded-[7px] border border-gray-300 px-[6px] text-left text-[11px] leading-none outline-none hover:bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
        >
          <span className={`truncate ${value.name ? 'text-gray-900' : 'text-gray-400'}`} title={value.name || undefined}>
            {value.name || 'Select category…'}
          </span>
        </button>

        {open && position && typeof document !== 'undefined' && createPortal(
          <div
            ref={dropdownRef}
            style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
            className="z-[70] flex h-72 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          >
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search categories…"
              className="w-full shrink-0 border-b border-gray-100 px-3 py-2 text-sm outline-none"
            />
            <div className="min-h-0 flex-1 overflow-y-auto">
            {showBack && (
              <button
                type="button"
                onClick={goBack}
                className="flex w-full items-center gap-1.5 border-b border-gray-100 px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                ← {backLabel}
              </button>
            )}
            {!searching && path.length > 0 && (
              <div className="px-3 pt-2 pb-1 text-xs text-gray-400 truncate" title={path.map((p) => p.name).join(' > ')}>
                {path.map((p) => p.name).join(' > ')}
              </div>
            )}
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
            {loading && <div className="px-3 py-2 text-xs text-gray-400">Loading…</div>}
            {!loading &&
              results.map((category) => (
                <div key={category.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => select(category)}
                    className="min-w-0 flex-1 px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="truncate text-gray-900">{category.name}</div>
                    {searching && <div className="truncate text-xs text-gray-400">{category.fullName}</div>}
                  </button>
                  {!category.isLeaf && (
                    <button
                      type="button"
                      onClick={() => drillInto(category)}
                      aria-label={`Browse ${category.name}`}
                      title={`Browse ${category.name}`}
                      className="shrink-0 px-2.5 py-2 text-gray-400 hover:text-gray-700 cursor-pointer"
                    >
                      ›
                    </button>
                  )}
                </div>
              ))}
            {!loading && results.length === 0 && <div className="px-3 py-2 text-xs text-gray-400">No matches</div>}
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
