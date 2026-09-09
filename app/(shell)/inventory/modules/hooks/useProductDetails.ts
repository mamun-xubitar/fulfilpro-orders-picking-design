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
  remarks: '',
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
    remarks: product.remarks,
    sizes: formatSizesInput(product.sizes),
    colours: formatColoursInput(product.colours),
    status: product.status,
    verified: product.verified,
  };
}

/** Plain string fields the curried `set` helper drives — the rest have their own setters. */
type TextField = Exclude<keyof ProductDetailsForm, 'verified' | 'status' | 'categoryId' | 'supplierIds'>;

type UseProductDetailsArgs = {
  product: ProductRecord | null;
  onSaved: (product: ProductRecord) => void;
};

export function useProductDetails({ product, onSaved }: UseProductDetailsArgs) {
  // Draft and edit mode are tagged with the product they belong to, so changing
  // product discards them without an effect having to reset anything.
  const [draft, setDraft] = useState<{ productId: string; form: ProductDetailsForm } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Mirrors the New Product modal: locked (the default) re-derives the handle from the product
  // name on every keystroke; unlocking hands control to the admin.
  const [handleLocked, setHandleLocked] = useState(true);
  const { request, loading: saving, errors, setErrors } = useRequest<ProductRecord>();

  const saved = product ? productToForm(product) : EMPTY_FORM;
  const form = draft && draft.productId === product?.id ? draft.form : saved;
  const editing = editingId !== null && editingId === product?.id;

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
    setHandleLocked((prev) => {
      const next = !prev;
      if (next) write({ ...form, handle: slugifyHandle(form.name) });
      return next;
    });
  };

  const setCategory = (category: { id: string | null; name: string }) => {
    write({ ...form, category: category.name, categoryId: category.id });
  };

  const setDescription = (description: string) => write({ ...form, description });

  const saveDetails = () => {
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
        remarks: form.remarks,
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
        return validationErrors;
      },
      successMessage: 'Product details saved',
      onSuccess: ({ data }) => {
        onSaved(data);
        setDraft(null);
        setEditingId(null);
        setHandleLocked(true);
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
        onSaved(data);
        syncListsFromProduct(data);
      },
    });
    return null;
  };

  return {
    editing,
    saving,
    errors,
    form,
    set,
    setName,
    handleLocked,
    toggleHandleLock,
    setCategory,
    setDescription,
    setStatus: (status: ProductStatusValue) => write({ ...form, status }),
    setVerified: (verified: boolean) => write({ ...form, verified }),
    setSupplierIds: (supplierIds: string[]) => write({ ...form, supplierIds }),
    startEdit: () => {
      if (!product) return;
      setEditingId(product.id);
      setHandleLocked(true);
      setErrors({});
    },
    cancelEdit: () => {
      setDraft(null);
      setEditingId(null);
      setHandleLocked(true);
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
