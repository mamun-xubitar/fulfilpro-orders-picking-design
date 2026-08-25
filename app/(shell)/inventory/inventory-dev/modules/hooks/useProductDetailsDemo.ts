'use client';

import { useState } from 'react';
import { formatSizesInput, parseSizesInput } from '../utils';
import type { ColourOption, ProductDetailsForm, ProductRecord, ProductStatusValue } from '../types';

const EMPTY_FORM: ProductDetailsForm = {
  itemNo: '',
  brand: '',
  name: '',
  category: '',
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
type TextField = Exclude<keyof ProductDetailsForm, 'colours' | 'verified' | 'status'>;

export function useProductDetailsDemo(product: ProductRecord | null) {
  // Draft and edit mode are tagged with the product they belong to, so changing
  // product discards them without an effect having to reset anything.
  const [draft, setDraft] = useState<{ productId: string; form: ProductDetailsForm } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const setColour = (index: number, patch: Partial<ColourOption>) => {
    write({ ...form, colours: form.colours.map((c, i) => (i === index ? { ...c, ...patch } : c)) });
  };

  return {
    editing,
    form,
    set,
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
    /** Demo mode: exits edit mode without writing back to `products`. */
    saveDetails: () => setEditingId(null),
    // Effective lists, so the variants matrix reflects an in-progress edit.
    sizes: parseSizesInput(form.sizes),
    colours: form.colours,
  };
}
