'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildGalleryTiles } from '../utils';
import type { ProductRecord } from '../types';

export function useProductImages(product: ProductRecord | null) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [lightboxActiveKey, setLightboxActiveKey] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  /** One tile per linked image, per still-unlinked colour, and per unassigned image — shared by
   * both the Main Image panel's rail and the lightbox, since each image already appears exactly
   * once. */
  const tiles = useMemo(() => {
    if (!product) return [];
    return buildGalleryTiles(product.images, product.variants, product.colours);
  }, [product]);

  /**
   * Resolved rather than stored, so switching product falls back to the first
   * tile without an effect having to reset the selection.
   */
  const activeIndex = useMemo(() => {
    const found = tiles.findIndex((t) => t.key === activeKey);
    return found >= 0 ? found : 0;
  }, [tiles, activeKey]);

  const active = tiles[activeIndex] ?? null;

  const lightboxIndex = useMemo(() => {
    const found = tiles.findIndex((t) => t.key === lightboxActiveKey);
    return found >= 0 ? found : 0;
  }, [tiles, lightboxActiveKey]);

  const lightboxActive = tiles[lightboxIndex] ?? null;

  const step = useCallback(
    (direction: 1 | -1) => {
      if (tiles.length === 0) return;
      setLightboxActiveKey(tiles[(lightboxIndex + direction + tiles.length) % tiles.length].key);
    },
    [tiles, lightboxIndex]
  );

  /** Opens on whatever's active in the panel; stepping inside the lightbox from there doesn't write back. */
  const openLightbox = useCallback(() => {
    if (tiles.length === 0) return;
    setLightboxActiveKey(active ? active.key : tiles[0].key);
    setLightboxOpen(true);
  }, [active, tiles]);

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
    tiles,
    active,
    activeKey: active?.key ?? null,
    setActiveKey,
    lightboxItems: tiles,
    lightboxActive,
    lightboxActiveKey: lightboxActive?.key ?? null,
    setLightboxActiveKey,
    /** Flat, ungrouped rows — every image, for the Edit Images modal. */
    images: product?.images ?? [],
    lightboxOpen,
    openLightbox,
    closeLightbox: () => setLightboxOpen(false),
    step,
  };
}
