'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildLightboxItems, groupImagesByColour } from '../utils';
import type { ProductRecord } from '../types';

export function useProductImages(product: ProductRecord | null) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [lightboxActiveKey, setLightboxActiveKey] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  /** One deduped tile per colourway — drives the Main Image panel's rail. */
  const groups = useMemo(() => {
    if (!product) return [];
    return groupImagesByColour(product.images, product.colours);
  }, [product]);

  /** Every image individually, plus a placeholder for empty colours — drives the lightbox. */
  const lightboxItems = useMemo(() => {
    if (!product) return [];
    return buildLightboxItems(product.images, product.colours);
  }, [product]);

  /**
   * Resolved rather than stored, so switching product falls back to the first
   * group without an effect having to reset the selection.
   */
  const activeIndex = useMemo(() => {
    const found = groups.findIndex((g) => g.key === activeKey);
    return found >= 0 ? found : 0;
  }, [groups, activeKey]);

  const active = groups[activeIndex] ?? null;

  const lightboxIndex = useMemo(() => {
    const found = lightboxItems.findIndex((item) => item.key === lightboxActiveKey);
    return found >= 0 ? found : 0;
  }, [lightboxItems, lightboxActiveKey]);

  const lightboxActive = lightboxItems[lightboxIndex] ?? null;

  const step = useCallback(
    (direction: 1 | -1) => {
      if (lightboxItems.length === 0) return;
      setLightboxActiveKey(lightboxItems[(lightboxIndex + direction + lightboxItems.length) % lightboxItems.length].key);
    },
    [lightboxItems, lightboxIndex]
  );

  /** Opens on whatever's active in the panel; stepping inside the lightbox from there doesn't write back. */
  const openLightbox = useCallback(() => {
    if (lightboxItems.length === 0) return;
    const matchKey = active ? (active.kind === 'photo' ? active.image.id : `placeholder:${active.key}`) : null;
    const found = matchKey ? lightboxItems.some((item) => item.key === matchKey) : false;
    setLightboxActiveKey(found ? matchKey : lightboxItems[0].key);
    setLightboxOpen(true);
  }, [active, lightboxItems]);

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
    groups,
    active,
    activeKey: active?.key ?? null,
    setActiveKey,
    lightboxItems,
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
