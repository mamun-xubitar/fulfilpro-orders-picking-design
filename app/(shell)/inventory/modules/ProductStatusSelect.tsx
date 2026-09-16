'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { STATUS_OPTIONS } from './constants';
import { ChevronDown } from './icons';
import type { ProductStatusValue } from './types';

type ProductStatusSelectProps = {
  value: ProductStatusValue;
  onChange: (status: ProductStatusValue) => void;
  id?: string;
  className?: string;
};

/** Structural classes every trigger needs regardless of visual skin — kept separate from
 * `className` so a caller's override only replaces the *visual* classes (border/padding/font
 * size/focus ring) rather than accidentally dropping the flex layout that pins the chevron to
 * the right edge. */
const TRIGGER_LAYOUT_CLASS = 'flex w-full items-center justify-between gap-2 text-left cursor-pointer';
const DEFAULT_TRIGGER_VISUAL_CLASS =
  'h-[24px] rounded-[7px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring';

/**
 * Shopify-style status dropdown — Active / Draft / Unlisted. Each row shows its own explanatory
 * copy while the dropdown is open (the closed trigger shows only the selected label). Single
 * source of truth for every status control in the hub (Product Details, the store
 * publish/bulk-update drafts) — see `STATUS_OPTIONS`.
 */
export default function ProductStatusSelect({ value, onChange, id, className }: ProductStatusSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const selectedIndex = Math.max(0, STATUS_OPTIONS.findIndex((o) => o.value === value));
  const selected = STATUS_OPTIONS[selectedIndex];

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  // Portalled to document.body (fixed position) so the Product details panel's
  // `overflow-y-auto` scroll container can't clip the menu — same pattern as
  // SupplierMultiSelect/CategoryPicker. Menu content and keyboard behaviour unchanged.
  // Above-placement uses the menu's measured height (3 options ≈ 140px, but measured
  // not guessed) so it sits 4px above the trigger instead of floating with a gap.
  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 16);
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      const below = window.innerHeight - rect.bottom;
      if (below < 200 && rect.top > below) {
        const measured = dropdownRef.current?.offsetHeight;
        const height = measured && measured > 0 ? measured : 150;
        const top = Math.max(8, rect.top - height - 4);
        setPosition((prev) => (prev && prev.top === top && prev.left === left && prev.width === width ? prev : { top, left, width }));
      } else {
        const top = rect.bottom + 4;
        setPosition((prev) => (prev && prev.top === top && prev.left === left && prev.width === width ? prev : { top, left, width }));
      }
    };
    updatePosition();
    // Re-measure on the next frame — on first open the menu isn't mounted yet so the
    // height above is a fallback; once mounted this corrects to the exact measured
    // height so the menu sits flush above the trigger.
    const raf = requestAnimationFrame(updatePosition);
    const panel = rootRef.current?.closest('section');
    const resizeObserver = panel ? new ResizeObserver(updatePosition) : null;
    if (panel) resizeObserver?.observe(panel);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open ]);

  const openMenu = () => {
    setHighlighted(selectedIndex);
    setOpen(true);
  };

  const toggleMenu = () => (open ? setOpen(false) : openMenu());

  const commit = (index: number) => {
    onChange(STATUS_OPTIONS[index].value);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, STATUS_OPTIONS.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commit(highlighted);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={toggleMenu}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Status"
        className={`${TRIGGER_LAYOUT_CLASS} ${className ?? DEFAULT_TRIGGER_VISUAL_CLASS}`}
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 text-inventory-text-subtle transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && position && typeof document !== 'undefined' && createPortal(
        <ul
          ref={dropdownRef}
          role="listbox"
          aria-label="Status"
          style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
          className="z-[70] max-h-72 overflow-y-auto rounded-[7px] border border-inventory-border bg-inventory-surface py-1 shadow-lg inventory-dropdown-in"
        >
          {STATUS_OPTIONS.map((option, index) => (
            <li key={option.value} role="option" aria-selected={option.value === value}>
              <button
                type="button"
                onClick={() => commit(index)}
                onMouseEnter={() => setHighlighted(index)}
                className={`block w-full px-[10px] py-[6px] text-left transition-colors duration-100 cursor-pointer ${
                  index === highlighted ? 'bg-inventory-secondary/10' : 'hover:bg-inventory-surface-hover'
                }`}
              >
                <span className="block text-[11px] font-bold leading-snug text-inventory-text">{option.label}</span>
                <span className="block text-[10px] leading-snug text-inventory-text-subtle">{option.hint}</span>
              </button>
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}
