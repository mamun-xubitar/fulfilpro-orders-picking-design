'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { deriveColorFromName } from '@/lib/inventory/colour';
import { isValidHandle, slugifyHandle } from '@/lib/inventory/handle';
import { findCaseInsensitiveDuplicate, formatColoursInput, formatSizesInput, parseColoursInput, parseSizesInput } from '../utils';
import type { ProductDetailsForm, ProductRecord, ProductStatusValue } from '../types';

const EMPTY_FORM: ProductDetailsForm = {
  itemNo: '',
  handle: '',
  supplierIds: [],
  brand: '',
  name: '',
  category: '',
  categoryId: null,
  sku: '',
  description: '',
  productRemark: '',
  poQuantity: '1',
  sizes: '',
  colours: '',
  status: 'DRAFT',
  verified: false,
};

function productToForm(product: ProductRecord): ProductDetailsForm {
  return {
    itemNo: product.itemNo,
    handle: product.handle,
    supplierIds: product.suppliers.map((s) => s.id),
    brand: product.brand,
    name: product.name,
    category: product.category,
    categoryId: product.categoryId,
    sku: product.sku,
    description: product.description,
    productRemark: product.productRemark,
    poQuantity: String(product.poQuantity),
    sizes: formatSizesInput(product.sizes),
    colours: formatColoursInput(product.colours),
    status: product.status,
    verified: product.verified,
  };
}

/** Value equality for the dirty check below — `form` and `saved` are independently computed
 * objects (the latter freshly derived from `product` on every render), so reference equality
 * would never do. `supplierIds` is the only array field; every other field is a primitive. */
function formsEqual(a: ProductDetailsForm, b: ProductDetailsForm): boolean {
  return (
    a.itemNo === b.itemNo &&
    a.handle === b.handle &&
    a.brand === b.brand &&
    a.name === b.name &&
    a.category === b.category &&
    a.categoryId === b.categoryId &&
    a.sku === b.sku &&
    a.description === b.description &&
    a.productRemark === b.productRemark &&
    a.poQuantity === b.poQuantity &&
    a.sizes === b.sizes &&
    a.colours === b.colours &&
    a.status === b.status &&
    a.verified === b.verified &&
    a.supplierIds.length === b.supplierIds.length &&
    a.supplierIds.every((id, i) => id === b.supplierIds[i])
  );
}

/** Plain string fields the curried `set` helper drives — the rest have their own setters. */
type TextField = Exclude<keyof ProductDetailsForm, 'verified' | 'status' | 'categoryId' | 'supplierIds'>;

type UseProductDetailsArgs = {
  product: ProductRecord | null;
  onSaved: (product: ProductRecord) => void;
  /** Persists the typed colour/size lists as global preset groups — called once per *successful*
   * save (Save, wizard Next, Add colour, Add sizes), never on a rejected one. Non-blocking: a
   * preset write that fails never fails the product save that triggered it, and is never surfaced
   * inline — see useInventoryPresets.ensureGroup. Optional so this hook still composes on its own
   * (e.g. in tests) without a presets hook wired up. */
  ensureGroup?: (kind: 'colour' | 'size', items: string[]) => Promise<{ ok: boolean; error: string | null }>;
};

export function useProductDetails({ product, onSaved, ensureGroup }: UseProductDetailsArgs) {
  // Draft is tagged with the product it belongs to, so changing product discards it without an
  // effect having to reset anything.
  const [draft, setDraft] = useState<{ productId: string; form: ProductDetailsForm } | null>(null);
  // Mirrors the New Product modal: locked (the default) re-derives the handle from the product
  // name on every keystroke; unlocking hands control to the admin. Tagged with the product it
  // belongs to (same pattern as `draft`) so an unlock made on one product doesn't carry over to
  // the next — there's no explicit "start edit" moment anymore (the panel is always editable) to
  // reset it at.
  const [storedHandleLocked, setStoredHandleLocked] = useState<{ productId: string; locked: boolean } | null>(null);
  const handleLocked = storedHandleLocked && storedHandleLocked.productId === product?.id ? storedHandleLocked.locked : true;
  const { request, loading: saving, errors, setErrors } = useRequest<ProductRecord>();

  const saved = product ? productToForm(product) : EMPTY_FORM;
  const form = draft && draft.productId === product?.id ? draft.form : saved;
  // The panel is always editable — `editing` now just means "there's a product loaded to edit".
  const editing = product !== null;
  // Collapses to false whenever there's no applicable draft, since `form` itself collapses to
  // `saved` in that case — a value typed then typed back to the original also disarms this.
  const dirty = !formsEqual(form, saved);

  const write = (next: ProductDetailsForm) => {
    if (!product) return;
    setDraft({ productId: product.id, form: next });
    setErrors((prev) => (Object.keys(prev).length > 0 ? {} : prev));
  };

  const set = (field: TextField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    write({ ...form, [field]: e.target.value });
  };

  const setName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    write({ ...form, name, ...(handleLocked ? { handle: slugifyHandle(name) } : {}) });
  };

  const toggleHandleLock = () => {
    if (!product) return;
    const next = !handleLocked;
    if (next) write({ ...form, handle: slugifyHandle(form.name) });
    setStoredHandleLocked({ productId: product.id, locked: next });
  };

  const setCategory = (category: { id: string | null; name: string }) => {
    write({ ...form, category: category.name, categoryId: category.id });
  };

  const setDescription = (description: string) => write({ ...form, description });

  /** `after` fires once the save succeeds — used by the New Product wizard to advance to the
   * next step only on a confirmed save, without duplicating this request. */
  const saveDetails = (after?: () => void) => {
    if (!product) return;
    request({
      url: `/api/inventory/catalog/${product.id}`,
      method: 'PATCH',
      data: {
        itemNo: form.itemNo,
        handle: form.handle,
        supplierIds: form.supplierIds,
        brand: form.brand,
        name: form.name,
        category: form.category,
        categoryId: form.categoryId,
        sku: form.sku,
        description: form.description,
        productRemark: form.productRemark,
        poQuantity: Number(form.poQuantity) || 1,
        sizes: parseSizesInput(form.sizes),
        colours: parseColoursInput(form.colours),
        status: form.status,
        verified: form.verified,
      },
      validation: async () => {
        const validationErrors: Record<string, string> = {};
        if (!isValidHandle(form.handle.trim())) validationErrors.handle = 'Enter a valid handle (lowercase letters, numbers and dashes)';
        if (form.supplierIds.length === 0) validationErrors.supplierId = 'At least one supplier is required';
        const dupColour = findCaseInsensitiveDuplicate(parseColoursInput(form.colours).map((c) => c.name));
        if (dupColour) validationErrors.colours = `"${dupColour}" is listed more than once`;
        const dupSize = findCaseInsensitiveDuplicate(parseSizesInput(form.sizes));
        if (dupSize) validationErrors.sizes = `"${dupSize}" is listed more than once`;
        if (!Number.isFinite(Number(form.poQuantity)) || Number(form.poQuantity) < 1) validationErrors.poQuantity = 'Enter a quantity of at least 1';
        return validationErrors;
      },
      successMessage: 'Product details saved',
      onSuccess: ({ data }) => {
        void ensureGroup?.('colour', parseColoursInput(form.colours).map((c) => c.name));
        void ensureGroup?.('size', parseSizesInput(form.sizes));
        onSaved(data);
        setDraft(null);
        setStoredHandleLocked({ productId: data.id, locked: true });
        after?.();
      },
    });
  };

  /** Rewrites only the draft's `sizes` / `colours` fields from the server's copy of the
   * product, leaving any other in-progress edit untouched. Called after a variant delete (or any
   * other server-side mutation) prunes a colour/size the draft doesn't know about yet — otherwise
   * the draft keeps offering a value the server has already removed, or rejects one it already
   * re-allows. */
  const syncListsFromProduct = (updated: ProductRecord) => {
    if (!draft || draft.productId !== updated.id) return;
    setDraft({
      productId: updated.id,
      form: { ...draft.form, sizes: formatSizesInput(updated.sizes), colours: formatColoursInput(updated.colours) },
    });
  };

  /** Appends one or more comma-separated sizes and saves in one PATCH — for the matrix
   * toolbar's "Add size" modal, which shouldn't require opening the Product Details edit form.
   * Dedupes case-insensitively against both the current list and the input itself: a duplicate
   * is toasted and skipped rather than blocking the rest, unless every value in the input turns
   * out to be a duplicate, in which case nothing is saved and the first one is returned as an
   * inline error (so the modal doesn't close having silently done nothing). */
  const quickAddSizes = (values: string[]): string | null => {
    if (!product) return null;
    const currentSizes = parseSizesInput(form.sizes);
    const seen = new Set(currentSizes.map((s) => s.toLowerCase()));
    const toAdd: string[] = [];
    const duplicates: string[] = [];
    for (const raw of values) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) {
        duplicates.push(trimmed);
        continue;
      }
      seen.add(key);
      toAdd.push(trimmed);
    }
    if (toAdd.length === 0) return duplicates.length > 0 ? `"${duplicates[0]}" already exists` : null;
    if (duplicates.length > 0) toast.warning(`Skipped ${duplicates.length} duplicate size${duplicates.length === 1 ? '' : 's'}: ${duplicates.join(', ')}`);
    const nextSizes = [...currentSizes, ...toAdd];
    write({ ...form, sizes: formatSizesInput(nextSizes) });
    request({
      url: `/api/inventory/catalog/${product.id}`,
      method: 'PATCH',
      data: { sizes: nextSizes },
      successMessage: toAdd.length === 1 ? 'Size added' : `${toAdd.length} sizes added`,
      onSuccess: ({ data }) => {
        // The group the admin meant is the full typed list, not just the survivors of the
        // dedupe above — captured from `values` (this function's own argument), not `toAdd`.
        void ensureGroup?.('size', values);
        onSaved(data);
        syncListsFromProduct(data);
      },
    });
    return null;
  };

  /** Appends one or more comma-separated colours and saves in one PATCH — mirrors
   * quickAddSizes. */
  const quickAddColours = (names: string[]): string | null => {
    if (!product) return null;
    const currentColours = parseColoursInput(form.colours);
    const seen = new Set(currentColours.map((c) => c.name.toLowerCase()));
    const toAdd: { name: string; color: string }[] = [];
    const duplicates: string[] = [];
    for (const raw of names) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) {
        duplicates.push(trimmed);
        continue;
      }
      seen.add(key);
      toAdd.push({ name: trimmed, color: deriveColorFromName(trimmed) });
    }
    if (toAdd.length === 0) return duplicates.length > 0 ? `"${duplicates[0]}" already exists` : null;
    if (duplicates.length > 0) toast.warning(`Skipped ${duplicates.length} duplicate colour${duplicates.length === 1 ? '' : 's'}: ${duplicates.join(', ')}`);
    const nextColours = [...currentColours, ...toAdd];
    write({ ...form, colours: formatColoursInput(nextColours) });
    request({
      url: `/api/inventory/catalog/${product.id}`,
      method: 'PATCH',
      data: { colours: nextColours },
      successMessage: toAdd.length === 1 ? 'Colour added' : `${toAdd.length} colours added`,
      onSuccess: ({ data }) => {
        // The group the admin meant is the full typed list, not just the survivors of the
        // dedupe above — captured from `names` (this function's own argument), not `toAdd`.
        void ensureGroup?.('colour', names);
        onSaved(data);
        syncListsFromProduct(data);
      },
    });
    return null;
  };

  return {
    editing,
    dirty,
    saving,
    errors,
    form,
    /** The product this draft belongs to — used by the itemNo availability check to exclude the
     * product's own current itemNo from the collision check. */
    productId: product?.id ?? null,
    set,
    setName,
    handleLocked,
    toggleHandleLock,
    setCategory,
    setDescription,
    setStatus: (status: ProductStatusValue) => write({ ...form, status }),
    setVerified: (verified: boolean) => write({ ...form, verified }),
    setSupplierIds: (supplierIds: string[]) => write({ ...form, supplierIds }),
    setSizesValue: (sizes: string) => write({ ...form, sizes }),
    setColoursValue: (colours: string) => write({ ...form, colours }),
    /** Discards the in-progress draft — the panel itself no longer has a Cancel button (always
     * editable, Save-only), but the New Product wizard's "Skip" still uses this to back out of
     * step 2 without saving. */
    cancelEdit: () => {
      setDraft(null);
      if (product) setStoredHandleLocked({ productId: product.id, locked: true });
      setErrors({});
    },
    saveDetails,
    quickAddSizes,
    quickAddColours,
    syncListsFromProduct,
    // Effective lists, so the variants matrix reflects an in-progress edit.
    sizes: parseSizesInput(form.sizes),
    colours: parseColoursInput(form.colours),
  };
}
