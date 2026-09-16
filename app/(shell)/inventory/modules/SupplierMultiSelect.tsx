'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FieldLabel } from './ProductFieldRows';
import { Close, Plus } from './icons';

type DropdownPosition = { top: number; left: number; width: number };

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
  /** Shows a red asterisk after the label — the product can't be saved without a supplier. */
  required?: boolean;
};

/**
 * A product's suppliers — a chip trigger plus a checkbox dropdown, same mechanics and classes as
 * TagsPicker/CollectionsPicker so it reads as one family. Prop-driven rather than fetching, since
 * the supplier list is already loaded page-wide. Every linked supplier is equal: there's no
 * default/primary among them.
 */
export default function SupplierMultiSelect({ suppliers, selectedIds, onChange, error, onCreateSupplier, onAddSupplier, required }: SupplierMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
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

  // The dropdown is portalled to document.body (fixed position) so the Product
  // details panel's `overflow-y-auto` scroll container can't clip it or force the
  // grid row to reflow when it opens — same pattern as OrderPicker.
  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(Math.max(rect.width, 280), window.innerWidth - 16);
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
      <FieldLabel>
        Suppliers{required && <span className="ml-0.5 text-inventory-danger">*</span>}
      </FieldLabel>
      <div className="relative flex items-start gap-1.5">
        <button
          ref={anchorRef}
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex min-h-[24px] w-full flex-wrap items-center gap-[4px] rounded-[7px] border border-inventory-border-strong px-[6px] py-[3px] text-left text-[11px] leading-none outline-none hover:bg-inventory-surface-hover focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer"
        >
          {selected.length === 0 && <span className="px-[2px] text-inventory-text-subtle">Select suppliers…</span>}
          {selected.map((s) => (
            <span
              key={s.id}
              className="flex items-center gap-[3px] rounded-full border border-inventory-border bg-inventory-surface-muted px-[5px] py-[1px] text-[9px] font-semibold uppercase leading-none text-inventory-text-muted"
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
                className="text-inventory-text-subtle hover:text-inventory-danger-hover"
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
            className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[7px] border border-inventory-border-strong bg-inventory-surface text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-surface-hover hover:text-inventory-text-muted cursor-pointer"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}

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
              placeholder="Search suppliers…"
              className="w-full border-b border-inventory-divider px-3 py-2 text-sm outline-none"
            />
            {suppliers.length === 0 && !trimmedQuery && <div className="px-3 py-2 text-xs text-inventory-text-subtle">No suppliers yet.</div>}
            {results.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-inventory-surface-hover">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(s.id)}
                  onChange={() => toggle(s.id)}
                  className="rounded border-inventory-border-strong text-inventory-secondary"
                />
                <span className="truncate text-inventory-text">{s.name}</span>
              </label>
            ))}
            {results.length === 0 && trimmedQuery && (
              <div className="px-3 py-2 text-xs text-inventory-text-subtle">No suppliers match “{trimmedQuery}”.</div>
            )}
            {trimmedQuery && onCreateSupplier && (
              <button
                type="button"
                onClick={() => {
                  onCreateSupplier(trimmedQuery);
                  setOpen(false);
                  setQuery('');
                }}
                className="flex w-full items-center gap-1.5 border-t border-inventory-divider px-3 py-2 text-left text-sm font-semibold text-inventory-secondary hover:bg-inventory-secondary/10 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Create supplier “{trimmedQuery}”
              </button>
            )}
          </div>,
          document.body
        )}
      </div>
      {error && <p className="mt-1 text-xs text-inventory-danger">{error}</p>}
    </div>
  );
}
