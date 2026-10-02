'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnchoredDropdown } from './hooks/useAnchoredDropdown';
import type { ProductImage } from './types';

type StoreSystemImageMenuProps = {
  systemImages: ProductImage[];
  /** The trigger button, rendered by the caller so it matches its sibling icon buttons. */
  renderTrigger: (props: { ref: React.RefObject<HTMLButtonElement | null>; onClick: () => void; open: boolean }) => React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  onPick: (image: ProductImage) => void;
};

const MENU_WIDTH = 252;

/** The "update from system image" dropdown: every image on the system product as a thumbnail grid,
 * anchored to the tile's icon button. Portalled (and wrapped in `.inventory-theme`) so the tile's
 * `overflow-hidden` and the modal's scroll container can't clip it. */
export default function StoreSystemImageMenu({ systemImages, renderTrigger, onOpenChange, onPick }: StoreSystemImageMenuProps) {
  const [open, setOpenState] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const setOpen = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
  };
  const position = useAnchoredDropdown({ anchorRef, dropdownRef: menuRef, open, onClose: () => setOpen(false), width: MENU_WIDTH, maxHeight: 260 });

  return (
    <>
      {renderTrigger({ ref: anchorRef, onClick: () => setOpen(!open), open })}
      {open &&
        position &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="inventory-theme">
            <div
              ref={menuRef}
              role="listbox"
              aria-label="System images"
              style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
              className="inventory-dropdown-in z-[70] rounded-lg border border-inventory-border bg-inventory-surface p-[6px] shadow-lg"
            >
              <p className="px-[2px] pb-[5px] text-[9.5px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">Use a system image</p>
              {systemImages.length === 0 ? (
                <p className="px-[2px] py-[6px] text-[11px] text-inventory-text-subtle">The system product has no images.</p>
              ) : (
                <div className="grid max-h-[212px] grid-cols-4 gap-[5px] overflow-y-auto thin-scroll p-[1px]">
                  {systemImages.map((img, i) => (
                    <button
                      key={img.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      aria-label={img.altText || `System image ${i + 1}`}
                      onClick={() => {
                        setOpen(false);
                        onPick(img);
                      }}
                      className="relative aspect-square overflow-hidden rounded-[6px] border border-inventory-border bg-inventory-surface-muted transition-[border-color,box-shadow] duration-150 hover:border-inventory-primary hover:ring-2 hover:ring-inventory-primary-ring focus-visible:border-inventory-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inventory-primary-ring cursor-pointer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      <span className="absolute left-[2px] top-[2px] rounded-[4px] bg-black/60 px-[3px] py-[1px] text-[8.5px] font-bold leading-none tabular-nums text-white">{i + 1}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
