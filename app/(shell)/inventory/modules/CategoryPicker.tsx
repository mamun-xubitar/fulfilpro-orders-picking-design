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
  /** Overrides the field label — "Shopify Category" everywhere this taxonomy tree is now shown,
   * to distinguish it from the flat hub-only Category (HubCategoryPicker). */
  label?: string;
  /** Suppresses the field's own label row — for a caller (e.g. StoreDiffFieldRow) that renders
   * its own label alongside the current store value. */
  hideLabel?: boolean;
};

/**
 * Searches — or browses — the live Shopify taxonomy, the source of truth for every store's
 * category picker. An empty query browses top-level categories with drill-down via a chevron on
 * every non-leaf row; typing a query switches to a flat search across the whole tree. A back
 * button pinned at the top of the dropdown pops one level of the browse path (or leaves search
 * mode) without an extra request.
 */
export default function CategoryPicker({ value, onChange, label = 'Shopify Category', hideLabel }: CategoryPickerProps) {
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
      const top = below < 224 && rect.top > below ? Math.max(8, rect.top - 228) : rect.bottom + 4;
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
      {!hideLabel && <FieldLabel>{label}</FieldLabel>}
      <div className="relative">
        <button
          ref={anchorRef}
          type="button"
          onClick={() => {
            setPath([]);
            setQuery('');
            setOpen((prev) => !prev);
          }}
          className="flex h-[24px] w-full items-center justify-between rounded-[7px] border border-inventory-border-strong px-[6px] text-left text-[11px] leading-none outline-none hover:bg-inventory-surface-hover focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer"
        >
          <span className={`truncate ${value.name ? 'uppercase text-inventory-text' : 'text-inventory-text-subtle'}`} title={value.name || undefined}>
            {value.name || 'Unassigned'}
          </span>
        </button>

        {open && position && typeof document !== 'undefined' && createPortal(
          <div
            ref={dropdownRef}
            style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
            className="z-[70] flex max-h-56 flex-col overflow-hidden rounded-lg border border-inventory-border bg-inventory-surface py-1 shadow-lg inventory-dropdown-in"
          >
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search categories…"
              className="mx-1 mb-1 h-[24px] shrink-0 rounded-[6px] border border-inventory-border px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring placeholder:text-inventory-text-subtle"
            />
            <div className="min-h-0 flex-1 overflow-y-auto">
            {showBack && (
              <button
                type="button"
                onClick={goBack}
                className="flex w-full items-center gap-1.5 border-b border-inventory-divider px-2 py-1 text-left text-[11px] font-medium leading-none text-inventory-text-muted hover:bg-inventory-surface-hover cursor-pointer"
              >
                ← {backLabel}
              </button>
            )}
            {!searching && path.length > 0 && (
              <div className="px-2 py-1 text-[11px] leading-none text-inventory-text-subtle truncate" title={path.map((p) => p.name).join(' > ')}>
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
                className="w-full px-2 py-1 text-left text-[11px] font-medium leading-none text-inventory-text-subtle hover:bg-inventory-surface-hover cursor-pointer"
              >
                Clear category
              </button>
            )}
            {loading && <div className="px-2 py-1 text-[11px] text-inventory-text-subtle">Loading…</div>}
            {!loading &&
              results.map((category) => (
                <div key={category.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => select(category)}
                    className="min-w-0 flex-1 px-2 py-1 text-left text-[11px] leading-none hover:bg-inventory-surface-hover cursor-pointer"
                  >
                    <div className="truncate text-inventory-text">{category.name}</div>
                    {searching && <div className="truncate text-[10px] leading-none text-inventory-text-subtle mt-0.5">{category.fullName}</div>}
                  </button>
                  {!category.isLeaf && (
                    <button
                      type="button"
                      onClick={() => drillInto(category)}
                      aria-label={`Browse ${category.name}`}
                      title={`Browse ${category.name}`}
                      className="shrink-0 px-2 py-1 text-[11px] leading-none text-inventory-text-subtle hover:bg-inventory-surface-hover hover:text-inventory-text-muted cursor-pointer"
                    >
                      ›
                    </button>
                  )}
                </div>
              ))}
            {!loading && results.length === 0 && <div className="px-2 py-1 text-[11px] text-inventory-text-subtle">No matches</div>}
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
