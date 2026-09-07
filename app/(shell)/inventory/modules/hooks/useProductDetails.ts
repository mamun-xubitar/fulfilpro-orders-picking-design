'use client';

import { useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { deriveColorFromName } from '@/lib/inventory/colour';
import { findCaseInsensitiveDuplicate, formatColoursInput, formatSizesInput, parseColoursInput, parseSizesInput } from '../utils';
import type { ProductDetailsForm, ProductRecord, ProductStatusValue } from '../types';

const EMPTY_FORM: ProductDetailsForm = {
  itemNo: '',
  handle: '',
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
type TextField = Exclude<keyof ProductDetailsForm, 'verified' | 'status' | 'categoryId'>;

type UseProductDetailsArgs = {
  product: ProductRecord | null;
  onSaved: (product: ProductRecord) => void;
};

export function useProductDetails({ product, onSaved }: UseProductDetailsArgs) {
  // Draft and edit mode are tagged with the product they belong to, so changing
  // product discards them without an effect having to reset anything.
  const [draft, setDraft] = useState<{ productId: string; form: ProductDetailsForm } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  /** Appends one size and saves immediately — for the matrix toolbar's "Add size" button,
   * which shouldn't require opening the Product Details edit form. Returns an error message
   * on a duplicate (case-insensitive) instead of adding it, or null on success. */
  const quickAddSize = (value: string): string | null => {
    if (!product) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const currentSizes = parseSizesInput(form.sizes);
    if (currentSizes.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return `"${trimmed}" already exists`;
    const nextSizes = [...currentSizes, trimmed];
    write({ ...form, sizes: formatSizesInput(nextSizes) });
    request({
      url: `/api/inventory/catalog/${product.id}`,
      method: 'PATCH',
      data: { sizes: nextSizes },
      successMessage: 'Size added',
      onSuccess: ({ data }) => {
        onSaved(data);
        syncListsFromProduct(data);
      },
    });
    return null;
  };

  /** Appends one colour and saves immediately — mirrors quickAddSize. Returns an error message
   * on a duplicate name (case-insensitive) instead of adding it, or null on success. */
  const quickAddColour = (name: string): string | null => {
    if (!product) return null;
    const trimmed = name.trim();
    if (!trimmed) return null;
    const currentColours = parseColoursInput(form.colours);
    if (currentColours.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return `"${trimmed}" already exists`;
    const nextColours = [...currentColours, { name: trimmed, color: deriveColorFromName(trimmed) }];
    write({ ...form, colours: formatColoursInput(nextColours) });
    request({
      url: `/api/inventory/catalog/${product.id}`,
      method: 'PATCH',
      data: { colours: nextColours },
      successMessage: 'Colour added',
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
    setCategory,
    setDescription,
    setStatus: (status: ProductStatusValue) => write({ ...form, status }),
    setVerified: (verified: boolean) => write({ ...form, verified }),
    startEdit: () => {
      if (!product) return;
      setEditingId(product.id);
      setErrors({});
    },
    cancelEdit: () => {
      setDraft(null);
      setEditingId(null);
      setErrors({});
    },
    saveDetails,
    quickAddSize,
    quickAddColour,
    syncListsFromProduct,
    // Effective lists, so the variants matrix reflects an in-progress edit.
    sizes: parseSizesInput(form.sizes),
    colours: parseColoursInput(form.colours),
  };
}
