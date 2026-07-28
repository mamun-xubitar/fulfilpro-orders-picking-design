'use client';

import { useMemo, useState } from 'react';
import { getVariantSize, groupVariantsByColor } from '../utils';
import type { ProductDetail } from '../types';

export function useProductVariants(product: ProductDetail | null) {
  // null = untouched → all colors selected by default
  const [colorSelection, setColorSelection] = useState<Set<string> | null>(null);
  const [sizeFilter, setSizeFilter] = useState('');

  const variants = useMemo(() => product?.variants ?? [], [product]);
  const colorGroups = useMemo(() => groupVariantsByColor(variants), [variants]);

  const selectedColorKeys = useMemo(
    () => colorSelection ?? new Set(colorGroups.map((g) => g.key)),
    [colorSelection, colorGroups],
  );

  const allColorsSelected =
    colorGroups.length > 0 && colorGroups.every((g) => selectedColorKeys.has(g.key));

  const sizeOptions = useMemo(() => {
    const sizes = new Set<string>();
    for (const variant of variants) {
      const size = getVariantSize(variant);
      if (size) sizes.add(size);
    }
    return [...sizes].sort();
  }, [variants]);

  const toggleColor = (key: string) => {
    const next = new Set(selectedColorKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setColorSelection(next);
  };

  const toggleAllColors = () => {
    setColorSelection(allColorsSelected ? new Set() : new Set(colorGroups.map((g) => g.key)));
  };

  const filteredVariants = useMemo(() => {
    return variants.filter((variant) => {
      const group = colorGroups.find((g) => g.variantIds.includes(variant.id));
      if (!group || !selectedColorKeys.has(group.key)) return false;
      if (sizeFilter && getVariantSize(variant) !== sizeFilter) return false;
      return true;
    });
  }, [variants, selectedColorKeys, colorGroups, sizeFilter]);

  return {
    colorGroups,
    selectedColorKeys,
    toggleColor,
    allColorsSelected,
    toggleAllColors,
    sizeOptions,
    sizeFilter,
    setSizeFilter,
    filteredVariants,
  };
}
