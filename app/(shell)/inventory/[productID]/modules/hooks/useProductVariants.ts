'use client';

import { useMemo, useState } from 'react';
import { getVariantSize, groupVariantsByColor } from '../utils';
import type { ProductDetail } from '../types';

export function useProductVariants(product: ProductDetail | null) {
  const [selectedColorKeys, setSelectedColorKeys] = useState<Set<string>>(new Set());
  const [sizeFilter, setSizeFilter] = useState('');

  const variants = useMemo(() => product?.variants ?? [], [product]);
  const colorGroups = useMemo(() => groupVariantsByColor(variants), [variants]);

  const sizeOptions = useMemo(() => {
    const sizes = new Set<string>();
    for (const variant of variants) {
      const size = getVariantSize(variant);
      if (size) sizes.add(size);
    }
    return [...sizes].sort();
  }, [variants]);

  const toggleColor = (key: string) => {
    setSelectedColorKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredVariants = useMemo(() => {
    return variants.filter((variant) => {
      if (selectedColorKeys.size > 0) {
        const group = colorGroups.find((g) => g.variantIds.includes(variant.id));
        if (!group || !selectedColorKeys.has(group.key)) return false;
      }
      if (sizeFilter && getVariantSize(variant) !== sizeFilter) return false;
      return true;
    });
  }, [variants, selectedColorKeys, colorGroups, sizeFilter]);

  return { colorGroups, selectedColorKeys, toggleColor, sizeOptions, sizeFilter, setSizeFilter, filteredVariants };
}
