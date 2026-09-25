'use client';

import { useMemo, useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { upperTrim } from '@/lib/utils/common';
import { naturalCompare } from '../utils';
import type { OptionLibraryState } from '../hooks/useOptionLibrary';
import type { ProductRecord } from '../types';

export type OptionKind = 'colour' | 'size';

/** One row in a Colour or Size column. `id` is the backing GlobalColour/GlobalSize row's id when
 * this name is in the global library, or null when it only exists on this product/session so far
 * (shown with a NEW badge) — cleared back to an id once "Save" writes it to the library. */
export type OptionItem = { name: string; id: string | null; checked: boolean; isNew: boolean };

/** One row of the live variant preview (checked colours x checked sizes). */
export type VariantDraftRow = {
  key: string;
  colour: string;
  size: string;
  /** True when this combo isn't among the product's current variants yet. */
  isNew: boolean;
  stockOnHand: number;
  /** null on a brand-new combo nobody has typed a trigger for yet — shown blank, and left out of
   * the apply request so the server falls back to the store's low-stock threshold, same as
   * reconcileVariants. */
  trigger: number | null;
};

type ValueEntry = { stockOnHand: number; trigger: number | null };

function keyOf(colour: string, size: string): string {
  return `${colour.toLowerCase()}::${size.toUpperCase()}`;
}

/** Case-insensitive split on commas, trimmed, blanks dropped — same shape as parseSizesInput. */
function splitNames(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

/** First name in `raw` (comma-separated names allowed) that's already in `items` — case-insensitive,
 * including duplicates within `raw` itself — or null if none. Shared by `add()` and the live
 * as-you-type validation so both agree on what counts as a duplicate. */
function findDuplicate(items: OptionItem[], raw: string): string | null {
  const names = splitNames(raw).map(upperTrim);
  const seen = new Set(items.map((i) => i.name.toLowerCase()));
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) return name;
    seen.add(key);
  }
  return null;
}

function buildItems(library: { id: string; name: string }[], productNames: string[]): OptionItem[] {
  // Names are shown and sent uppercase in this modal — the server stores them uppercase anyway.
  const productKeys = new Set(productNames.map((n) => n.toLowerCase()));
  const libraryKeys = new Set(library.map((l) => l.name.toLowerCase()));
  const items: OptionItem[] = library.map((l) => ({ name: upperTrim(l.name), id: l.id, checked: productKeys.has(l.name.toLowerCase()), isNew: false }));
  for (const name of productNames) {
    if (!libraryKeys.has(name.toLowerCase())) items.push({ name: upperTrim(name), id: null, checked: true, isNew: true });
  }
  return items;
}

type UseColourSizeModalArgs = {
  product: ProductRecord;
  optionLibrary: OptionLibraryState;
  onApplied: (product: ProductRecord) => void;
  onClose: () => void;
};

/**
 * Drives the Colour & size adjustment modal — the single entry point for adding/removing colours
 * and sizes and (re)generating a product's variants from them, replacing the old preset quick-add
 * modals and Product details' own colour/size fields. See PATTERN.md's three-move pattern; this
 * hook is the "state + handlers" layer for ColourSizeModal.tsx.
 */
export function useColourSizeModal({ product, optionLibrary, onApplied, onClose }: UseColourSizeModalArgs) {
  const [colourItems, setColourItems] = useState<OptionItem[]>(() => buildItems(optionLibrary.colours, product.colours.map((c) => c.name)));
  const [sizeItems, setSizeItems] = useState<OptionItem[]>(() => buildItems(optionLibrary.sizes, product.sizes));
  const [colourInput, setColourInput] = useState('');
  const [sizeInput, setSizeInput] = useState('');
  const [colourAddError, setColourAddError] = useState<string | null>(null);
  const [sizeAddError, setSizeAddError] = useState<string | null>(null);
  // Ids removed from the column (via the ✕ button) that still need to be deleted from the shared
  // library — armed by `remove()`, cleared by a successful `saveToLibrary()`.
  const [colourPendingDeletes, setColourPendingDeletes] = useState<string[]>([]);
  const [sizePendingDeletes, setSizePendingDeletes] = useState<string[]>([]);
  const [colourSaving, setColourSaving] = useState(false);
  const [sizeSaving, setSizeSaving] = useState(false);
  // Per-combo stock on hand / trigger typed in the modal, keyed by colour+size — survives
  // checking/unchecking colours or sizes so a typed value isn't lost by an unrelated toggle.
  const [values, setValues] = useState<Record<string, ValueEntry>>({});
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const { request: requestApply, loading: applying } = useRequest<ProductRecord>();

  const itemsFor = (kind: OptionKind) => (kind === 'colour' ? colourItems : sizeItems);
  const setItemsFor = (kind: OptionKind) => (kind === 'colour' ? setColourItems : setSizeItems);
  const pendingDeletesFor = (kind: OptionKind) => (kind === 'colour' ? colourPendingDeletes : sizePendingDeletes);
  const setPendingDeletesFor = (kind: OptionKind) => (kind === 'colour' ? setColourPendingDeletes : setSizePendingDeletes);

  const toggle = (kind: OptionKind, name: string) => {
    setItemsFor(kind)((prev) => prev.map((i) => (i.name.toLowerCase() === name.toLowerCase() ? { ...i, checked: !i.checked } : i)));
  };

  const toggleAll = (kind: OptionKind, checked: boolean) => {
    setItemsFor(kind)((prev) => prev.map((i) => ({ ...i, checked })));
  };

  const add = (kind: OptionKind) => {
    const raw = kind === 'colour' ? colourInput : sizeInput;
    const setInput = kind === 'colour' ? setColourInput : setSizeInput;
    const setError = kind === 'colour' ? setColourAddError : setSizeAddError;
    const names = splitNames(raw).map(upperTrim);
    if (names.length === 0) return;

    const dup = findDuplicate(itemsFor(kind), raw);
    if (dup) {
      setError(`"${dup}" is already in the list`);
      return;
    }

    const toAdd: OptionItem[] = names.map((name) => ({ name, id: null, checked: true, isNew: true }));
    setItemsFor(kind)((prev) => [...prev, ...toAdd]);
    setInput('');
    setError(null);
  };

  /** Re-validates on every keystroke so a duplicate-name error appears/clears instantly, instead
   * of only on Add. */
  const setInputFor = (kind: OptionKind) => (value: string) => {
    const setInput = kind === 'colour' ? setColourInput : setSizeInput;
    const setError = kind === 'colour' ? setColourAddError : setSizeAddError;
    setInput(value);
    const dup = findDuplicate(itemsFor(kind), value);
    setError(dup ? `"${dup}" is already in the list` : null);
  };

  /** Removes a name from the column locally only. If it was library-backed, its id is queued for
   * deletion on the next Save (see `saveToLibrary`) rather than deleted immediately. */
  const remove = (kind: OptionKind, name: string) => {
    const item = itemsFor(kind).find((i) => i.name.toLowerCase() === name.toLowerCase());
    setItemsFor(kind)((prev) => prev.filter((i) => i.name.toLowerCase() !== name.toLowerCase()));
    if (item?.id) setPendingDeletesFor(kind)((prev) => [...prev, item.id as string]);
  };

  /** Applies every staged change for the column to the shared library: deletes ids queued by
   * `remove()`, then writes every name currently in the column (checked or not), clearing the NEW
   * badge on whichever ones the server confirms are now saved. Failed deletes stay queued so the
   * next Save retries them. */
  const saveToLibrary = async (kind: OptionKind) => {
    const setSaving = kind === 'colour' ? setColourSaving : setSizeSaving;
    setSaving(true);
    try {
      const pending = pendingDeletesFor(kind);
      if (pending.length > 0) {
        const outcomes = await Promise.all(pending.map((id) => optionLibrary.deleteItem(kind, id)));
        setPendingDeletesFor(kind)(pending.filter((_, idx) => !outcomes[idx]));
      }

      const items = itemsFor(kind);
      const result = await optionLibrary.saveNames(kind, items.map((i) => i.name));
      if (!result) return;
      const byLower = new Map(result.map((r) => [r.name.toLowerCase(), r]));
      setItemsFor(kind)((prev) => prev.map((i) => {
        const match = byLower.get(i.name.toLowerCase());
        return match ? { ...i, id: match.id, isNew: false } : i;
      }));
    } finally {
      setSaving(false);
    }
  };

  const checkedColours = useMemo(() => colourItems.filter((i) => i.checked).map((i) => i.name), [colourItems]);
  const checkedSizes = useMemo(() => sizeItems.filter((i) => i.checked).map((i) => i.name), [sizeItems]);

  const variants: VariantDraftRow[] = useMemo(() => {
    const colourAxis = checkedColours.length > 0 ? checkedColours : [''];
    const sizeAxis = checkedSizes.length > 0 ? checkedSizes : [''];
    const existingByKey = new Map(product.variants.map((v) => [keyOf(v.colour, v.size), v]));
    const rows: VariantDraftRow[] = [];
    for (const colour of colourAxis) {
      for (const size of sizeAxis) {
        const key = keyOf(colour, size);
        const existing = existingByKey.get(key);
        const typed = values[key];
        rows.push({
          key,
          colour,
          size,
          isNew: !existing,
          stockOnHand: typed?.stockOnHand ?? existing?.stockOnHand ?? 0,
          trigger: typed?.trigger ?? existing?.trigger ?? null,
        });
      }
    }
    // Display order only (item 2) — numbers before letters, then alphabetical. The axis arrays
    // driving generation (checkedColours/checkedSizes, sent to apply-options as-is below) keep
    // their own library/insertion order, so this never touches the size positions stored on the
    // product or the matrix's own size order.
    rows.sort((a, b) => naturalCompare(a.colour, b.colour) || naturalCompare(a.size, b.size));
    return rows;
  }, [checkedColours, checkedSizes, product.variants, values]);

  const setVariantValue = (key: string, field: 'stockOnHand' | 'trigger', value: number) => {
    setValues((prev) => {
      const row = variants.find((v) => v.key === key);
      const base: ValueEntry = prev[key] ?? { stockOnHand: row?.stockOnHand ?? 0, trigger: row?.trigger ?? null };
      return { ...prev, [key]: { ...base, [field]: value } };
    });
  };

  const fillAll = (field: 'stockOnHand' | 'trigger', value: number) => {
    setValues((prev) => {
      const next = { ...prev };
      for (const row of variants) {
        const base = next[row.key] ?? { stockOnHand: row.stockOnHand, trigger: row.trigger };
        next[row.key] = { ...base, [field]: value };
      }
      return next;
    });
  };

  /** Replace/Insert only ever wrote variants — any not-yet-saved colour/size names (or pending
   * library deletes) sat unsaved unless the user separately hit each column's own Save first. Run
   * the same save each Save button uses for whichever column has unsaved state before applying,
   * so Replace/Insert always leaves the shared library consistent with what's checked. */
  const apply = async (mode: 'replace' | 'insert') => {
    const colourHasNew = colourItems.some((i) => i.isNew) || colourPendingDeletes.length > 0;
    const sizeHasNew = sizeItems.some((i) => i.isNew) || sizePendingDeletes.length > 0;
    if (colourHasNew) await saveToLibrary('colour');
    if (sizeHasNew) await saveToLibrary('size');

    requestApply({
      url: `/api/inventory/catalog/${product.id}/variants/apply-options`,
      method: 'POST',
      data: {
        mode,
        colours: checkedColours,
        sizes: checkedSizes,
        values: variants.map((v) => ({
          colour: v.colour,
          size: v.size,
          stockOnHand: v.stockOnHand,
          ...(v.trigger !== null ? { trigger: v.trigger } : {}),
        })),
      },
      successMessage: mode === 'replace' ? 'Variants replaced' : 'Variants inserted',
      onSuccess: ({ data }) => {
        onApplied(data);
        setReplaceConfirmOpen(false);
        onClose();
      },
    });
  };

  const existingVariantCount = product.variants.length;
  const newVariantCount = variants.filter((v) => v.isNew).length;
  const hasChecked = checkedColours.length > 0 || checkedSizes.length > 0;

  const previewByKey = new Map(variants.map((v) => [v.key, v]));
  const removedVariantCount = product.variants.filter((v) => !previewByKey.has(keyOf(v.colour, v.size))).length;
  // Only Replace writes typed stock/trigger onto combos that already exist — Insert skips them.
  const valuesChanged = product.variants.some((v) => {
    const row = previewByKey.get(keyOf(v.colour, v.size));
    return !!row && (row.stockOnHand !== v.stockOnHand || (row.trigger !== null && row.trigger !== v.trigger));
  });

  const insertDisabledReason = !hasChecked
    ? 'Check at least one colour or size'
    : newVariantCount === 0
      ? 'All checked variants already exist'
      : null;
  const replaceDisabledReason = !hasChecked
    ? 'Check at least one colour or size'
    : newVariantCount === 0 && removedVariantCount === 0 && !valuesChanged
      ? 'No changes to replace'
      : null;

  // Display order only (item 2) — the underlying colourItems/sizeItems arrays (and their
  // indices used by toggle/remove, which match by name rather than position) are untouched.
  const sortedColourItems = useMemo(() => [...colourItems].sort((a, b) => naturalCompare(a.name, b.name)), [colourItems]);
  const sortedSizeItems = useMemo(() => [...sizeItems].sort((a, b) => naturalCompare(a.name, b.name)), [sizeItems]);

  return {
    colour: {
      items: sortedColourItems,
      input: colourInput,
      setInput: setInputFor('colour'),
      error: colourAddError,
      hasNew: colourItems.some((i) => i.isNew) || colourPendingDeletes.length > 0,
      toggle: (name: string) => toggle('colour', name),
      toggleAll: (checked: boolean) => toggleAll('colour', checked),
      add: () => add('colour'),
      remove: (name: string) => remove('colour', name),
      save: () => saveToLibrary('colour'),
      saving: colourSaving || optionLibrary.saving,
    },
    size: {
      items: sortedSizeItems,
      input: sizeInput,
      setInput: setInputFor('size'),
      error: sizeAddError,
      hasNew: sizeItems.some((i) => i.isNew) || sizePendingDeletes.length > 0,
      toggle: (name: string) => toggle('size', name),
      toggleAll: (checked: boolean) => toggleAll('size', checked),
      add: () => add('size'),
      remove: (name: string) => remove('size', name),
      save: () => saveToLibrary('size'),
      saving: sizeSaving || optionLibrary.saving,
    },
    variants,
    setVariantValue,
    fillAll,
    applying,
    existingVariantCount,
    newVariantCount,
    removedVariantCount,
    valuesChanged,
    canInsert: !applying && !colourSaving && !sizeSaving && insertDisabledReason === null,
    canReplace: !applying && !colourSaving && !sizeSaving && replaceDisabledReason === null,
    insertDisabledReason,
    replaceDisabledReason,
    replaceConfirmOpen,
    openReplaceConfirm: () => setReplaceConfirmOpen(true),
    closeReplaceConfirm: () => setReplaceConfirmOpen(false),
    confirmReplace: () => apply('replace'),
    insert: () => apply('insert'),
    cancel: onClose,
  };
}

export type ColourSizeModalState = ReturnType<typeof useColourSizeModal>;
