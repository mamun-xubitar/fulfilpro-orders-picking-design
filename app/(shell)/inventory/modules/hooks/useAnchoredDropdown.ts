'use client';

import { useEffect, useRef, useState } from 'react';

export type AnchoredDropdownPosition = { top: number; left: number; width: number };

type UseAnchoredDropdownArgs = {
  anchorRef: { readonly current: Element | null };
  dropdownRef: { readonly current: Element | null };
  open: boolean;
  onClose: () => void;
  /** Fixed menu width — identical everywhere the picker is used, so the dropdown never
   * shifts size between contexts. Clamped into the viewport. */
  width: number;
  /** Menu's capped height, used as the first-frame estimate before it's measured. */
  maxHeight: number;
};

/**
 * Shared anchored-dropdown positioning for the store-draft pickers (Vendor, Type,
 * Collections, Tags): fixed width, measured-height above-placement so the menu sits flush
 * against the trigger, auto-close once the anchor scrolls out of view, outside-click and
 * Escape close. Same behavior family as the Supplier/Category/Status dropdowns, which keep
 * their own local versions.
 */
export function useAnchoredDropdown({
  anchorRef,
  dropdownRef,
  open,
  onClose,
  width,
  maxHeight,
}: UseAnchoredDropdownArgs): AnchoredDropdownPosition | null {
  const [position, setPosition] = useState<AnchoredDropdownPosition | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      onCloseRef.current();
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open, anchorRef, dropdownRef]);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        onCloseRef.current();
        return;
      }
      const w = Math.min(width, window.innerWidth - 16);
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8));
      const below = window.innerHeight - rect.bottom;
      // Only flip to above-placement once the menu is actually mounted and its real height is
      // known — before that, `measured` is 0 and we fall through to below-placement, which is
      // height-independent and therefore never overshoots on the first, unmeasured pass.
      const measured = dropdownRef.current instanceof HTMLElement ? dropdownRef.current.offsetHeight : 0;
      if (measured > 0 && below < maxHeight && rect.top > below) {
        const top = Math.max(8, rect.top - measured - 4);
        setPosition((prev) => (prev && prev.top === top && prev.left === left && prev.width === w ? prev : { top, left, width: w }));
      } else {
        const top = rect.bottom + 4;
        setPosition((prev) => (prev && prev.top === top && prev.left === left && prev.width === w ? prev : { top, left, width: w }));
      }
    };
    updatePosition();
    // Re-measure every frame while open — on first open the menu isn't mounted yet, so the
    // height above is a fallback; once mounted this corrects to the exact measured height. It also
    // follows an anchor that moves without a scroll/resize (e.g. a centred modal whose height
    // changes as its content filters). setPosition bails out when nothing moved.
    let raf = 0;
    const tick = () => {
      updatePosition();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, width, maxHeight, anchorRef, dropdownRef]);

  return position;
}
