'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { listColours, orderImages } from '../utils';
import type { ProductRecord } from '../types';

export function useProductImages(product: ProductRecord | null) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const images = useMemo(() => {
    if (!product) return [];
    return orderImages(product.images, listColours(product.variants));
  }, [product]);

  /**
   * Resolved rather than stored, so switching product falls back to the first
   * image without an effect having to reset the selection.
   */
  const activeIndex = useMemo(() => {
    const found = images.findIndex((i) => i.id === activeId);
    return found >= 0 ? found : 0;
  }, [images, activeId]);

  const active = images[activeIndex] ?? null;

  const step = useCallback(
    (direction: 1 | -1) => {
      if (images.length === 0) return;
      setActiveId(images[(activeIndex + direction + images.length) % images.length].id);
    },
    [images, activeIndex]
  );

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxOpen(false);
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, step]);

  return {
    images,
    active,
    activeId: active?.id ?? null,
    setActiveId,
    colourCount: images.filter((i) => i.colour !== null).length,
    lightboxOpen,
    openLightbox: () => images.length > 0 && setLightboxOpen(true),
    closeLightbox: () => setLightboxOpen(false),
    step,
  };
}
