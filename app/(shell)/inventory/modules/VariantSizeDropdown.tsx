'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnchoredDropdown } from './hooks/useAnchoredDropdown';
import type { OptionFilter } from './hooks/useVariantsMatrix';
import { ChevronDown } from './icons';
import { BTN_XS } from './MainImagePanel';

type VariantSizeDropdownProps = {
  size: OptionFilter;
};

/**
 * The Variants / stock toolbar's sizes filter — a checkbox multi-select over every size declared
 * on the product, same trigger/portal/positioning mechanics as SupplierMultiSelect. Purely
 * client-side: a toggle only hides/shows that size's rows in the table below, it never touches
 * the product or its variants — same as the colour panel beside the table.
 */
export default function VariantSizeDropdown({ size }: VariantSizeDropdownProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const position = useAnchoredDropdown({ anchorRef, dropdownRef, open, onClose: () => setOpen(false), width: 200, maxHeight: 260 });

  return (
    <div className="relative">
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={BTN_XS}
      >
        Sizes ({size.checkedCount}/{size.items.length})
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && position && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
          // z-[55]: above the Full view ModalShell (z-50).
          className="z-[55] max-h-[260px] overflow-y-auto rounded-lg border border-inventory-border bg-inventory-surface py-1 shadow-lg inventory-dropdown-in thin-scroll"
        >
          <label className="flex cursor-pointer items-center gap-2 border-b border-inventory-divider px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.3px] text-inventory-text-muted hover:bg-inventory-surface-hover">
            <input
              type="checkbox"
              checked={size.allChecked}
              ref={(el) => {
                if (el) el.indeterminate = size.someChecked && !size.allChecked;
              }}
              onChange={(e) => size.toggleAll(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-inventory-primary"
            />
            All sizes
          </label>
          {size.items.length === 0 && <p className="px-3 py-2 text-[11px] text-inventory-text-subtle">No sizes on this product.</p>}
          {size.items.map((item) => (
            <label key={item.name} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[11.5px] text-inventory-text hover:bg-inventory-surface-hover">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => size.toggle(item.name)}
                className="h-3.5 w-3.5 cursor-pointer accent-inventory-primary"
              />
              <span className="truncate">{item.name}</span>
            </label>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
