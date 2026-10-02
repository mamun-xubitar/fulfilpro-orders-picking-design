'use client';

import { useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { formatColourName } from '@/lib/inventory/colour';
import type { ProductRecord, StocktakeRecord, VariantRow } from '../types';

/** One countable line: a variant at one of its locations (or the lone line of a variant with none). */
export type StocktakeLine = { key: string; variant: VariantRow; location: { id: string; name: string } | null };

export type StocktakeFilters = { locationId: string; colour: string; size: string };
const NO_FILTERS: StocktakeFilters = { locationId: '', colour: '', size: '' };
/** The location filter's "variants kept nowhere" option. */
export const NO_LOCATION = '__none__';

export function buildStocktakeLines(product: ProductRecord | null): StocktakeLine[] {
  return (product?.variants ?? []).flatMap((variant): StocktakeLine[] => {
    if (variant.locations.length === 0) return [{ key: `${variant.id}:`, variant, location: null }];
    return variant.locations.map((location) => ({ key: `${variant.id}:${location.id}`, variant, location }));
  });
}

function matchesFilters(line: StocktakeLine, f: StocktakeFilters): boolean {
  if (f.colour && line.variant.colour !== f.colour) return false;
  if (f.size && line.variant.size !== f.size) return false;
  if (f.locationId === NO_LOCATION) return line.location === null;
  if (f.locationId) return line.location?.id === f.locationId;
  return true;
}

type UseStocktakeArgs = {
  product: ProductRecord | null;
  /** Fired after a stocktake is created, so the Stocktake tab refetches. */
  onCreated: () => void;
};

/** The "New stocktake" modal: pick which variant × location lines to count, optionally key in counts
 * that are already known, and create. Nothing is saved until Create. */
export function useStocktake({ product, onCreated }: UseStocktakeArgs) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<StocktakeFilters>(NO_FILTERS);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [counts, setCounts] = useState<Record<string, string>>({});
  const { request, loading: creating } = useRequest<StocktakeRecord>();

  const lines = buildStocktakeLines(product);
  const visible = lines.filter((l) => matchesFilters(l, filters));
  const selectedLines = lines.filter((l) => selected[l.key]);
  const allVisibleChecked = visible.length > 0 && visible.every((l) => selected[l.key]);

  const openModal = () => {
    setFilters(NO_FILTERS);
    setSelected({});
    setCounts({});
    setOpen(true);
  };
  const close = () => setOpen(false);
  const setFilter = (key: keyof StocktakeFilters, value: string) => setFilters((prev) => ({ ...prev, [key]: value }));
  const toggle = (key: string) => setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleAllVisible = () => setSelected((prev) => ({ ...prev, ...Object.fromEntries(visible.map((l) => [l.key, !allVisibleChecked])) }));
  const setCount = (key: string, value: string) => setCounts((prev) => ({ ...prev, [key]: value }));

  const create = () => {
    if (!product || selectedLines.length === 0) return;
    request({
      url: `/api/inventory/catalog/${product.id}/stocktakes`,
      method: 'POST',
      data: {
        lines: selectedLines.map((l) => ({
          variantId: l.variant.id,
          locationId: l.location?.id ?? null,
          countedQty: (counts[l.key] ?? '').trim() === '' ? null : Number(counts[l.key]),
        })),
      },
      successMessage: 'Stocktake created',
      onSuccess: () => {
        setOpen(false);
        onCreated();
      },
    });
  };

  const colours = [...new Set((product?.variants ?? []).map((v) => v.colour).filter(Boolean))].map((value) => ({ value, label: formatColourName(value) }));
  const sizes = [...new Set((product?.variants ?? []).map((v) => v.size).filter(Boolean))];
  const locations = [...new Map(lines.flatMap((l) => (l.location ? [[l.location.id, l.location] as const] : []))).values()];

  return {
    open,
    openModal,
    close,
    filters,
    setFilter,
    clearFilters: () => setFilters(NO_FILTERS),
    visible,
    selected,
    selectedCount: selectedLines.length,
    allVisibleChecked,
    toggle,
    toggleAllVisible,
    counts,
    setCount,
    creating,
    create,
    options: { colours, sizes, locations, hasUnlocated: lines.some((l) => !l.location) },
  };
}
