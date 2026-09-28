'use client';

import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnchoredDropdown } from './hooks/useAnchoredDropdown';
import OverflowChipRow from './OverflowChipRow';
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
  /** Shows a red asterisk after the label — the product can't be saved without a supplier. */
  required?: boolean;
};

/**
 * A product's suppliers — a chip trigger plus a checkbox dropdown, same mechanics and classes as
 * TagsPicker/CollectionsPicker so it reads as one family. Prop-driven rather than fetching, since
 * the supplier list is already loaded page-wide. Every linked supplier is equal: there's no
 * default/primary among them.
 *
 * Selected suppliers render on a single line via OverflowChipRow (same "+N" overflow badge as
 * Sizes/Colours) instead of wrapping — the badge opens this same dropdown, with whatever was
 * already selected when it opened pinned to the top so the full list is easy to review.
 */
export default function SupplierMultiSelect({ suppliers, selectedIds, onChange, error, onCreateSupplier, onAddSupplier, required }: SupplierMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Snapshotted only when the dropdown opens (see openDropdown) — a static sort order so rows
  // don't jump around under the pointer while checkboxes are being toggled.
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const anchorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Fixed 320px menu, measured-height above-placement, auto-close off-screen — shared hook,
  // same mechanics as TagsPicker/CollectionsPicker.
  const position = useAnchoredDropdown({ anchorRef, dropdownRef, open, onClose: () => setOpen(false), width: 320, maxHeight: 224 });

  const openDropdown = () => {
    setPinnedIds(selectedIds);
    setOpen(true);
  };
  const toggleDropdown = () => {
    if (open) {
      setOpen(false);
    } else {
      openDropdown();
    }
  };

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    const base = term ? suppliers.filter((s) => s.name.toLowerCase().includes(term)) : suppliers;
    if (term || pinnedIds.length === 0) return base;
    // Selected-at-open-time suppliers first, in their original relative order, then the rest.
    const pinnedSet = new Set(pinnedIds);
    return [...base.filter((s) => pinnedSet.has(s.id)), ...base.filter((s) => !pinnedSet.has(s.id))];
  }, [suppliers, query, pinnedIds]);

  const selected = selectedIds.map((id) => suppliers.find((s) => s.id === id) ?? { id, name: id });
  const toggle = (id: string) => onChange(selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);
  const remove = (id: string) => onChange(selectedIds.filter((s) => s !== id));
  const trimmedQuery = query.trim();

  const chipItems = selected.map((s) => ({
    key: s.id,
    label: s.name,
    // Capped and truncated so a long supplier name (or one that's really an email address, e.g.
    // a PO contact used as the name) can never fill the whole row and push the "+N" overflow
    // badge out of view — the badge's own space is reserved by OverflowChipRow based on each
    // chip's *rendered* width, so capping it here keeps that reservation honest too.
    node: (
      <span className="flex max-w-[110px] items-center gap-[3px] rounded-full border border-inventory-border bg-inventory-surface-muted px-[5px] py-[1px] text-[9px] font-semibold uppercase leading-none text-inventory-text-muted">
        <span className="min-w-0 truncate" title={s.name}>
          {s.name}
        </span>
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
          className="shrink-0 text-inventory-text-subtle hover:text-inventory-danger-hover"
        >
          <Close className="h-2.5 w-2.5" />
        </span>
      </span>
    ),
  }));

  return (
    <div className="min-w-0">
      <FieldLabel>
        Suppliers{required && <span className="ml-0.5 text-inventory-danger">*</span>}
      </FieldLabel>
      <div className="relative flex items-start gap-1.5">
        <div
          ref={anchorRef}
          role="button"
          tabIndex={0}
          onClick={toggleDropdown}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleDropdown();
            }
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex h-[24px] w-full min-w-0 items-center gap-[4px] rounded-[7px] border border-inventory-border-strong px-[6px] text-left text-[11px] leading-none outline-none hover:bg-inventory-surface-hover focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer"
        >
          <OverflowChipRow items={chipItems} onShowMore={openDropdown} emptyLabel="Select suppliers…" />
        </div>

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
            className="z-[70] flex max-h-56 flex-col overflow-hidden rounded-lg border border-inventory-border bg-inventory-surface py-1 shadow-lg inventory-dropdown-in"
          >
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false);
              }}
              placeholder="Search suppliers…"
              className="mx-1 mb-1 h-[24px] shrink-0 rounded-[6px] border border-inventory-border px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring placeholder:text-inventory-text-subtle"
            />
            <div className="min-h-0 flex-1 overflow-y-auto thin-scroll">
              {suppliers.length === 0 && !trimmedQuery && <div className="px-2 py-1 text-[11px] text-inventory-text-subtle">No suppliers yet.</div>}
              {results.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 px-2 py-1 text-[11px] leading-none hover:bg-inventory-surface-hover">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(s.id)}
                    onChange={() => toggle(s.id)}
                    className="h-3 w-3 shrink-0 cursor-pointer accent-inventory-primary"
                  />
                  <span className="truncate text-inventory-text">{s.name}</span>
                </label>
              ))}
              {results.length === 0 && trimmedQuery && (
                <div className="px-2 py-1 text-[11px] text-inventory-text-subtle">No suppliers match “{trimmedQuery}”.</div>
              )}
              {trimmedQuery && onCreateSupplier && (
                <button
                  type="button"
                  onClick={() => {
                    onCreateSupplier(trimmedQuery);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="flex w-full items-center gap-1.5 border-t border-inventory-divider px-2 py-1 text-left text-[11px] font-semibold text-inventory-secondary hover:bg-inventory-secondary/10 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  Create supplier “{trimmedQuery}”
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
      {error && <p className="mt-1 text-xs text-inventory-danger">{error}</p>}
    </div>
  );
}
