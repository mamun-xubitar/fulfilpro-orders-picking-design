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
    // Newest upload first (item 18) — the product's own images array stays position-ascending
    // for the Edit images grid and the product-list thumbnail, so the reverse happens only here.
    return buildGalleryTiles([...product.images].reverse(), product.variants, product.colours);
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

  // `product.images` is `position asc` (oldest→newest — every upload gets the next position, see
  // SupplierProductModel.addImage/addImages), so the last element is always the newest. Render-time
  // reset (same pattern as useProductsFilters' `applied` — avoids an effect round trip): resetting
  // both keys whenever this id changes falls back to `tiles[0]` above — which, after
  // buildGalleryTiles' merged photo pass, is genuinely the newest image — covering both "just
  // uploaded" and "switched to a different product" without a special case for either. Tagging an
  // existing photo's colour (setImageColour) doesn't touch this id, so it leaves the selection
  // alone.
  const latestImageId = product?.images[product.images.length - 1]?.id ?? null;
  const [seenLatestImageId, setSeenLatestImageId] = useState<string | null>(null);
  if (seenLatestImageId !== latestImageId) {
    setSeenLatestImageId(latestImageId);
    setActiveKey(null);
    setLightboxActiveKey(null);
  }

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
