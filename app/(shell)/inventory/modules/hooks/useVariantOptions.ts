'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { naturalCompare } from '../utils';
import type { ProductRecord, VariantRow } from '../types';

type OptionItem = { name: string; checked: boolean };

function variantKey(colour: string, size: string): string {
  return `${colour.toLowerCase()}::${size.toUpperCase()}`;
}

/** The variants a `colours`/`sizes` change would remove — same axis rule as the server's
 * reconcileVariants: an empty axis is represented by the '' sentinel, so a colour-only or
 * size-only product still keeps its one-axis rows. */
function variantsRemovedBy(variants: VariantRow[], colours: string[], sizes: string[]): VariantRow[] {
  const colourAxis = colours.length > 0 ? colours : [''];
  const sizeAxis = sizes.length > 0 ? sizes : [''];
  const validKeys = new Set(colourAxis.flatMap((c) => sizeAxis.map((s) => variantKey(c, s))));
  return variants.filter((v) => !validKeys.has(variantKey(v.colour, v.size)));
}

/** True when losing `variant` would lose real state — stock on hand, something committed against
 * it, or stock already on the water — rather than an empty row nobody would miss. */
function isAtRisk(variant: VariantRow): boolean {
  return variant.stockOnHand > 0 || variant.allocated > 0 || variant.incomingLots.length > 0;
}

function without(list: string[], name: string): string[] {
  return list.filter((n) => n.toLowerCase() !== name.toLowerCase());
}

type UseVariantOptionsArgs = {
  product: ProductRecord | null;
  onSaved: (product: ProductRecord) => void;
};

/**
 * Drives the Variants / stock toolbar's colour panel and sizes dropdown. Both list every colour
 * and size *declared* on the product, checked when at least one variant currently has that colour
 * or size. Toggling a checkbox only ever regenerates the variants to match — it never adds or
 * removes the colour/size itself, so an unchecked value stays listed (declared colours/sizes come
 * and go only through the Colour & size adjustment modal). See SupplierProductController.setOptions
 * for the server side: SupplierProductModel.syncVariantsToOptions creates the newly-checked combos
 * and deletes the ones no longer checked, without touching the product's declared lists.
 */
export function useVariantOptions({ product, onSaved }: UseVariantOptionsArgs) {
  const { request, loading: saving } = useRequest<ProductRecord>();
  // A toggle that would remove a variant carrying real stock/allocation/incoming waits here for
  // confirmation instead of saving immediately — tagged with its product so navigating away (or
  // a save landing from elsewhere) can't leave a stale confirmation open.
  const [pending, setPending] = useState<{ productId: string; colours: string[]; sizes: string[]; removed: VariantRow[] } | null>(null);

  const colourNames = product ? product.colours.map((c) => c.name) : [];
  const sizeNames = product ? product.sizes : [];
  const isColourChecked = (name: string) => !!product?.variants.some((v) => v.colour.toLowerCase() === name.toLowerCase());
  const isSizeChecked = (name: string) => !!product?.variants.some((v) => v.size.toLowerCase() === name.toLowerCase());

  const colourItems: OptionItem[] = [...colourNames].sort(naturalCompare).map((name) => ({ name, checked: isColourChecked(name) }));
  const sizeItems: OptionItem[] = sizeNames.map((name) => ({ name, checked: isSizeChecked(name) }));
  const checkedColours = colourNames.filter(isColourChecked);
  const checkedSizes = sizeNames.filter(isSizeChecked);

  const save = (colours: string[], sizes: string[]) => {
    if (!product) return;
    request({
      url: `/api/inventory/catalog/${product.id}/variants/options`,
      method: 'PATCH',
      data: { colours, sizes },
      successMessage: 'Variants updated',
      onSuccess: ({ data }) => {
        onSaved(data);
        setPending(null);
      },
    });
  };

  const commit = (colours: string[], sizes: string[]) => {
    if (!product) return;
    if (product.colours.length > 0 && colours.length === 0) {
      toast.error('Keep at least one colour checked');
      return;
    }
    if (product.sizes.length > 0 && sizes.length === 0) {
      toast.error('Keep at least one size checked');
      return;
    }
    const removed = variantsRemovedBy(product.variants, colours, sizes);
    if (removed.some(isAtRisk)) {
      setPending({ productId: product.id, colours, sizes, removed });
      return;
    }
    save(colours, sizes);
  };

  const pendingForProduct = pending && pending.productId === product?.id ? pending : null;

  return {
    colour: {
      items: colourItems,
      toggle: (name: string) => commit(isColourChecked(name) ? without(checkedColours, name) : [...checkedColours, name], checkedSizes),
      toggleAll: (checked: boolean) => commit(checked ? colourNames : [], checkedSizes),
      allChecked: colourItems.length > 0 && colourItems.every((i) => i.checked),
      someChecked: checkedColours.length > 0,
    },
    size: {
      items: sizeItems,
      toggle: (name: string) => commit(checkedColours, isSizeChecked(name) ? without(checkedSizes, name) : [...checkedSizes, name]),
      toggleAll: (checked: boolean) => commit(checkedColours, checked ? sizeNames : []),
      allChecked: sizeItems.length > 0 && sizeItems.every((i) => i.checked),
      someChecked: checkedSizes.length > 0,
      checkedCount: checkedSizes.length,
    },
    saving,
    pending: pendingForProduct,
    confirmPending: () => pendingForProduct && save(pendingForProduct.colours, pendingForProduct.sizes),
    cancelPending: () => setPending(null),
  };
}

export type VariantOptionsState = ReturnType<typeof useVariantOptions>;
