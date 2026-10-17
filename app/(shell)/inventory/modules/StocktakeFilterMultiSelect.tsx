'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnchoredDropdown } from './hooks/useAnchoredDropdown';
import { ChevronDown } from './icons';

const CONTROL =
  'inline-flex h-[24px] items-center gap-1 rounded-[7px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer';

type StocktakeFilterMultiSelectProps = {
  /** Plural noun, e.g. "locations": drives the "All locations" / "3 locations" trigger text. */
  noun: string;
  options: { value: string; label: string }[];
  /** Empty means no filter. */
  selected: string[];
  onChange: (next: string[]) => void;
};

/** A checkbox multi-select for the New stocktake filter bar. Same trigger/portal/positioning
 * mechanics as VariantSizeDropdown. Nothing selected means "all". */
export default function StocktakeFilterMultiSelect({ noun, options, selected, onChange }: StocktakeFilterMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const position = useAnchoredDropdown({ anchorRef, dropdownRef, open, onClose: () => setOpen(false), width: 200, maxHeight: 260 });

  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  const summary =
    selected.length === 0 ? `All ${noun}` : selected.length === 1 ? (options.find((o) => o.value === selected[0])?.label ?? `1 ${noun}`) : `${selected.length} ${noun}`;

  return (
    <div className="relative">
      <button ref={anchorRef} type="button" onClick={() => setOpen((prev) => !prev)} aria-label={noun} aria-haspopup="listbox" aria-expanded={open} className={CONTROL}>
        <span className="max-w-[120px] truncate">{summary}</span>
        <ChevronDown className="h-3 w-3" />
      </button>

      {open &&
        position &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
            // z-[55]: above the ModalShell (z-50).
            className="z-[55] max-h-[260px] overflow-y-auto rounded-lg border border-inventory-border bg-inventory-surface py-1 shadow-lg inventory-dropdown-in thin-scroll"
          >
            <label className="flex cursor-pointer items-center gap-2 border-b border-inventory-divider px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.3px] text-inventory-text-muted hover:bg-inventory-surface-hover">
              <input type="checkbox" checked={selected.length === 0} onChange={() => onChange([])} className="h-3.5 w-3.5 cursor-pointer accent-inventory-primary" />
              All {noun}
            </label>
            {options.length === 0 && <p className="px-3 py-2 text-[11px] text-inventory-text-subtle">No {noun}.</p>}
            {options.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[11.5px] text-inventory-text hover:bg-inventory-surface-hover">
                <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} className="h-3.5 w-3.5 cursor-pointer accent-inventory-primary" />
                <span className="truncate">{o.label}</span>
              </label>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
