'use client';

import { useRef, useState } from 'react';
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
  const { request: requestAi, loading: aiGenerating } = useRequest<{ description: string }>();
  // Original/Generated are two independent drafts of the description, tagged with the product
  // they belong to so a product switch drops them without an effect having to reset anything —
  // same pattern as `draft` above. Switching the active slot stows the other draft's edits rather
  // than discarding them (see setAiActive). `generatedBaseline` is the raw AI output, untouched by
  // stowing/hand-edits, so regenerate can detect an unsaved edit regardless of which tab is active.
  const [ai, setAi] = useState<{
    productId: string;
    active: 'original' | 'generated';
    original: string;
    generated: string;
    generatedBaseline: string;
  } | null>(null);

  const saved = product ? productToForm(product) : EMPTY_FORM;
  const form = draft && draft.productId === product?.id ? draft.form : saved;
  const editing = editingId !== null && editingId === product?.id;
  const effectiveAi = ai && product && ai.productId === product.id ? ai : null;

  // Latest-value refs for the AI request callbacks below, which are created (and capture `form`/
  // `product`) at click time but must act on whatever is current when the response lands — not
  // the stale click-time snapshot — and must bail out entirely if the admin has since switched to
  // a different product, rather than clobbering that product's currently-visible draft.
  const productRef = useRef(product);
  productRef.current = product;
  const formRef = useRef(form);
  formRef.current = form;

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

  /** Builds the request body for both generate and regenerate — the admin's in-progress draft,
   * not the last-saved product, so a generation reflects fields not yet saved. */
  const aiRequestData = (descriptionOverride: string) => ({
    productId: product?.id,
    name: form.name,
    brand: form.brand,
    category: form.category,
    description: descriptionOverride,
    remarks: form.remarks,
    sizes: parseSizesInput(form.sizes),
    colours: parseColoursInput(form.colours),
  });

  /** First generation — snapshots the description on screen as "Original", writes the AI result
   * into both "Generated" and the live field, and switches the icon into the Original/Generated/
   * Regenerate group. Nothing is persisted; Save writes whichever draft is active. */
  const generateDescription = () => {
    if (!product) return;
    const productId = product.id;
    const original = form.description;
    requestAi({
      url: '/api/inventory/ai/product-description',
      method: 'POST',
      showToast: false,
      data: aiRequestData(original),
      onSuccess: ({ data }) => {
        if (productRef.current?.id !== productId) return; // admin switched products while this was in flight
        setAi({ productId, active: 'generated', original, generated: data.description, generatedBaseline: data.description });
        write({ ...formRef.current, description: data.description });
      },
      onError: (err) => toast.error(err.general || 'Failed to generate description'),
    });
  };

  /** Switches which draft is live in the field. Stows the outgoing draft's current text (which
   * may have been hand-edited since generation) before swapping in the other one, so neither
   * draft loses edits by switching back and forth. */
  const setAiActive = (next: 'original' | 'generated') => {
    if (!effectiveAi || effectiveAi.active === next) return;
    const stowed = { ...effectiveAi, [effectiveAi.active]: form.description, active: next };
    setAi(stowed);
    write({ ...form, description: stowed[next] });
  };

  /** Re-requests a Generated draft from the current Original text. Confirms first if the admin
   * has hand-edited the Generated draft since it was last produced, since this overwrites it. */
  const regenerateDescription = () => {
    if (!effectiveAi || !product) return;
    // Compares against the raw last-fetched output rather than checking only the active tab, so
    // switching to Original right before regenerating can't sneak past an unconfirmed hand-edit.
    const currentGenerated = effectiveAi.active === 'generated' ? form.description : effectiveAi.generated;
    const hasUnsavedEdit = currentGenerated !== effectiveAi.generatedBaseline;
    if (hasUnsavedEdit && !window.confirm('Regenerating will discard your edits to the generated description. Continue?')) return;
    const productId = product.id;
    const original = effectiveAi.active === 'original' ? form.description : effectiveAi.original;
    requestAi({
      url: '/api/inventory/ai/product-description',
      method: 'POST',
      showToast: false,
      data: aiRequestData(original),
      onSuccess: ({ data }) => {
        if (productRef.current?.id !== productId) return; // admin switched products while this was in flight
        setAi({ productId, active: 'generated', original, generated: data.description, generatedBaseline: data.description });
        write({ ...formRef.current, description: data.description });
      },
      onError: (err) => toast.error(err.general || 'Failed to regenerate description'),
    });
  };

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
        setAi(null);
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
      setAi(null);
    },
    saveDetails,
    quickAddSizes,
    quickAddColours,
    syncListsFromProduct,
    ai: effectiveAi,
    aiGenerating,
    generateDescription,
    setAiActive,
    regenerateDescription,
    // Effective lists, so the variants matrix reflects an in-progress edit.
    sizes: parseSizesInput(form.sizes),
    colours: parseColoursInput(form.colours),
  };
}
