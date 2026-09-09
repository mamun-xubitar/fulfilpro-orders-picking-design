'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from './icons';

type StoreDraftVariantImageProps = {
  variantLabel: string;
  storeName: string;
  images: { id: string; url: string; altText: string | null }[];
  selectedImageId: string | null;
  onChange: (imageId: string | null) => void;
};

function imageLabel(img: { url: string; altText: string | null; id: string }): string {
  return img.altText || img.url.split('/').pop() || img.id;
}

/** One variant's image picker in the publish/bulk-update variant matrix — Shopify-style: at most
 * one image per variant (assigning here fans out to every variant of the same colour, see
 * StoreDraftBlock's setVariantImage), an image may be shared across several. A button+listbox
 * popover rather than a native `<select>` so every option can show its own thumbnail alongside
 * the name — a plain text list can't tell two similarly-named images apart. Rendered with
 * `position: fixed` off the trigger's own rect so it escapes the table's `overflow-x-auto`
 * clipping instead of being cut off. */
export default function StoreDraftVariantImage({ variantLabel, storeName, images, selectedImageId, onChange }: StoreDraftVariantImageProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = selectedImageId ? images.find((img) => img.id === selectedImageId) : undefined;

  useEffect(() => {
    if (!open) return;
    const positionMenu = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuStyle({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 220) });
    };
    positionMenu();

    const onPointerDown = (event: MouseEvent) => {
      if (buttonRef.current?.contains(event.target as Node) || menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', positionMenu, true);
    window.addEventListener('resize', positionMenu);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', positionMenu, true);
      window.removeEventListener('resize', positionMenu);
    };
  }, [open]);

  const pick = (imageId: string | null) => {
    onChange(imageId);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={images.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Image for ${variantLabel} at ${storeName}`}
        className="flex w-full items-center gap-1.5 rounded-lg border border-gray-300 px-1.5 py-1 text-left text-[12px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {selected ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selected.url} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
        ) : (
          <div className="h-6 w-6 shrink-0 rounded border border-dashed border-gray-300" />
        )}
        <span className="min-w-0 flex-1 truncate text-gray-700">{selected ? imageLabel(selected) : images.length === 0 ? 'No images' : '— none —'}</span>
        <ChevronDown className="h-3 w-3 shrink-0 text-gray-400" />
      </button>

      {open && menuStyle && (
        <div
          ref={menuRef}
          role="listbox"
          aria-label={`Choose an image for ${variantLabel}`}
          style={{ position: 'fixed', top: menuStyle.top, left: menuStyle.left, width: menuStyle.width }}
          className="z-50 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="option"
            aria-selected={selectedImageId === null}
            onClick={() => pick(null)}
            className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-[12px] hover:bg-gray-50 cursor-pointer ${
              selectedImageId === null ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-700'
            }`}
          >
            <div className="h-6 w-6 shrink-0 rounded border border-dashed border-gray-300" />
            — none —
          </button>
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              role="option"
              aria-selected={selectedImageId === img.id}
              onClick={() => pick(img.id)}
              className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-[12px] hover:bg-gray-50 cursor-pointer ${
                selectedImageId === img.id ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-700'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
              <span className="min-w-0 flex-1 truncate">{imageLabel(img)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
