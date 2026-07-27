import { useEffect, useMemo, useState } from 'react';
import { buildGalleryEntries, getSizeBreakdown } from '../utils';
import type { ProductDetail } from '../types';

export function useProductGallery(product: ProductDetail) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const entries = useMemo(() => buildGalleryEntries(product), [product]);
  const active = entries.find((e) => e.key === activeKey) ?? entries[0];
  const breakdown = useMemo(() => getSizeBreakdown(product.variants, active?.colorKey ?? null), [product.variants, active]);

  const step = (delta: number) => {
    if (entries.length === 0) return;
    const currentIndex = entries.findIndex((e) => e.key === active?.key);
    const nextIndex = (currentIndex + delta + entries.length) % entries.length;
    setActiveKey(entries[nextIndex].key);
  };

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, entries.length]);

  return {
    entries,
    active,
    breakdown,
    activeKey,
    setActiveKey,
    lightboxOpen,
    openLightbox: () => setLightboxOpen(true),
    closeLightbox: () => setLightboxOpen(false),
    step,
  };
}
