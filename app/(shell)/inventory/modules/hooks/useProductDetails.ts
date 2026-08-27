'use client';

import { useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { formatSizesInput, parseSizesInput } from '../utils';
import type { ColourOption, ProductDetailsForm, ProductRecord, ProductStatusValue } from '../types';

const EMPTY_FORM: ProductDetailsForm = {
  itemNo: '',
  brand: '',
  name: '',
  category: '',
  categoryId: null,
  sku: '',
  description: '',
  deliveryRemarks: '',
  sizes: '',
  colours: [],
  status: 'DRAFT',
  verified: false,
};

const NEW_COLOUR: ColourOption = { name: '', hex: '#cbd5e1' };

function productToForm(product: ProductRecord): ProductDetailsForm {
  return {
    itemNo: product.itemNo,
    brand: product.brand,
    name: product.name,
    category: product.category,
    categoryId: product.categoryId,
    sku: product.sku,
    description: product.description,
    deliveryRemarks: product.deliveryRemarks,
    sizes: formatSizesInput(product.sizes),
    colours: product.colours,
    status: product.status,
    verified: product.verified,
  };
}

/** Plain string fields the curried `set` helper drives — the rest have their own setters. */
type TextField = Exclude<keyof ProductDetailsForm, 'colours' | 'verified' | 'status' | 'categoryId'>;

type UseProductDetailsArgs = {
  product: ProductRecord | null;
  onSaved: (product: ProductRecord) => void;
};

export function useProductDetails({ product, onSaved }: UseProductDetailsArgs) {
  // Draft and edit mode are tagged with the product they belong to, so changing
  // product discards them without an effect having to reset anything.
  const [draft, setDraft] = useState<{ productId: string; form: ProductDetailsForm } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { request, loading: saving, errors } = useRequest<ProductRecord>();

  const saved = product ? productToForm(product) : EMPTY_FORM;
  const form = draft && draft.productId === product?.id ? draft.form : saved;
  const editing = editingId !== null && editingId === product?.id;

  const write = (next: ProductDetailsForm) => {
    if (!product) return;
    setDraft({ productId: product.id, form: next });
  };

  const set = (field: TextField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    write({ ...form, [field]: e.target.value });
  };

  const setCategory = (category: { id: string | null; name: string }) => {
    write({ ...form, category: category.name, categoryId: category.id });
  };

  const setColour = (index: number, patch: Partial<ColourOption>) => {
    write({ ...form, colours: form.colours.map((c, i) => (i === index ? { ...c, ...patch } : c)) });
  };

  const saveDetails = () => {
    if (!product) return;
    request({
      url: `/api/inventory/catalog/${product.id}`,
      method: 'PATCH',
      data: {
        itemNo: form.itemNo,
        brand: form.brand,
        name: form.name,
        category: form.category,
        categoryId: form.categoryId,
        sku: form.sku,
        description: form.description,
        deliveryRemarks: form.deliveryRemarks,
        sizes: parseSizesInput(form.sizes),
        colours: form.colours,
        status: form.status,
        verified: form.verified,
      },
      successMessage: 'Product details saved',
      onSuccess: ({ data }) => {
        onSaved(data);
        setDraft(null);
        setEditingId(null);
      },
    });
  };

  /** Appends one size and saves immediately — for the matrix toolbar's "Add size" button,
   * which shouldn't require opening the Product Details edit form. No-op on a duplicate. */
  const quickAddSize = (value: string) => {
    if (!product) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    const currentSizes = parseSizesInput(form.sizes);
    if (currentSizes.includes(trimmed)) return;
    const nextSizes = [...currentSizes, trimmed];
    write({ ...form, sizes: formatSizesInput(nextSizes) });
    request({
      url: `/api/inventory/catalog/${product.id}`,
      method: 'PATCH',
      data: { sizes: nextSizes },
      successMessage: 'Size added',
      onSuccess: ({ data }) => onSaved(data),
    });
  };

  /** Appends one colour and saves immediately — mirrors quickAddSize. No-op on a duplicate name. */
  const quickAddColour = (colour: ColourOption) => {
    if (!product) return;
    const name = colour.name.trim();
    if (!name || form.colours.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    const nextColours = [...form.colours, { name, hex: colour.hex || NEW_COLOUR.hex }];
    write({ ...form, colours: nextColours });
    request({
      url: `/api/inventory/catalog/${product.id}`,
      method: 'PATCH',
      data: { colours: nextColours },
      successMessage: 'Colour added',
      onSuccess: ({ data }) => onSaved(data),
    });
  };

  return {
    editing,
    saving,
    errors,
    form,
    set,
    setCategory,
    setColour,
    addColour: () => write({ ...form, colours: [...form.colours, NEW_COLOUR] }),
    removeColour: (index: number) => write({ ...form, colours: form.colours.filter((_, i) => i !== index) }),
    setStatus: (status: ProductStatusValue) => write({ ...form, status }),
    setVerified: (verified: boolean) => write({ ...form, verified }),
    startEdit: () => product && setEditingId(product.id),
    cancelEdit: () => {
      setDraft(null);
      setEditingId(null);
    },
    saveDetails,
    quickAddSize,
    quickAddColour,
    // Effective lists, so the variants matrix reflects an in-progress edit.
    sizes: parseSizesInput(form.sizes),
    colours: form.colours,
  };
}
