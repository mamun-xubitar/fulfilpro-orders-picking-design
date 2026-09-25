'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnchoredDropdown } from './hooks/useAnchoredDropdown';
import type { VariantOptionsState } from './hooks/useVariantOptions';
import { ChevronDown } from './icons';
import { BTN_XS } from './MainImagePanel';

type VariantSizeDropdownProps = {
  size: VariantOptionsState['size'];
  saving: boolean;
};

/**
 * The Variants / stock toolbar's sizes filter, replaced from a single-choice "All sizes" select
 * with a checkbox multi-select — same trigger/portal/positioning mechanics as
 * SupplierMultiSelect. Lists every size declared on the product; a toggle writes straight to the
 * product (via useVariantOptions), regenerating variants to match rather than narrowing a
 * client-side filter. Unchecking a size deletes its variants but leaves it listed, unchecked,
 * since it's still declared on the product — checking it back re-creates its rows.
 */
export default function VariantSizeDropdown({ size, saving }: VariantSizeDropdownProps) {
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
        disabled={saving}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={BTN_XS}
      >
        {saving && <span className="block h-3 w-3 animate-spin rounded-full border-2 border-inventory-text-subtle/30 border-t-inventory-text-subtle" />}
        Sizes ({size.checkedCount}/{size.items.length})
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && position && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
          // z-[55]: above the Full view ModalShell (z-50), but below the "Remove variants with
          // stock?" confirm's elevated ModalShell (z-[60]) — so a risky toggle's confirm opens on
          // top of this dropdown instead of underneath it.
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
              disabled={saving}
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
                disabled={saving}
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
