'use client';

import { useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { isValidHandle, slugifyHandle } from '@/lib/inventory/handle';
import { formatColoursInput, formatSizesInput, parseColoursInput, parseSizesInput } from '../utils';
import type { ProductDetailsForm, ProductRecord, ProductStatusValue } from '../types';

const EMPTY_FORM: ProductDetailsForm = {
  itemNo: '',
  handle: '',
  supplierIds: [],
  brand: '',
  name: '',
  category: '',
  categoryId: null,
  inventoryCategoryId: null,
  inventoryCategoryName: '',
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
    inventoryCategoryId: product.inventoryCategoryId,
    inventoryCategoryName: product.inventoryCategoryName ?? '',
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
    a.inventoryCategoryId === b.inventoryCategoryId &&
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
type TextField = Exclude<keyof ProductDetailsForm, 'verified' | 'status' | 'categoryId' | 'inventoryCategoryId' | 'inventoryCategoryName' | 'supplierIds'>;

type UseProductDetailsArgs = {
  product: ProductRecord | null;
  onSaved: (product: ProductRecord) => void;
  /** Handle lock state a product starts in (and returns to after save/cancel). Existing products
   * open unlocked; the New Product wizard passes true so the handle follows the name. */
  defaultHandleLocked?: boolean;
};

export function useProductDetails({ product, onSaved, defaultHandleLocked = false }: UseProductDetailsArgs) {
  // Draft is tagged with the product it belongs to, so changing product discards it without an
  // effect having to reset anything.
  const [draft, setDraft] = useState<{ productId: string; form: ProductDetailsForm } | null>(null);
  // Mirrors the New Product modal: locked re-derives the handle from the Item no. on every
  // keystroke (the default only inside the New Product wizard); unlocked hands control to the
  // admin (the default for existing products). Tagged with the product it
  // belongs to (same pattern as `draft`) so an unlock made on one product doesn't carry over to
  // the next — there's no explicit "start edit" moment anymore (the panel is always editable) to
  // reset it at.
  const [storedHandleLocked, setStoredHandleLocked] = useState<{ productId: string; locked: boolean } | null>(null);
  const handleLocked = storedHandleLocked && storedHandleLocked.productId === product?.id ? storedHandleLocked.locked : defaultHandleLocked;
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

  const setName = (e: React.ChangeEvent<HTMLInputElement>) => write({ ...form, name: e.target.value });

  const setItemNo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const itemNo = e.target.value;
    write({ ...form, itemNo, ...(handleLocked ? { handle: slugifyHandle(itemNo) } : {}) });
  };

  const toggleHandleLock = () => {
    if (!product) return;
    const next = !handleLocked;
    if (next) write({ ...form, handle: slugifyHandle(form.itemNo) });
    setStoredHandleLocked({ productId: product.id, locked: next });
  };

  const setCategory = (category: { id: string | null; name: string }) => {
    write({ ...form, category: category.name, categoryId: category.id });
  };

  const setInventoryCategory = (category: { id: string | null; name: string }) => {
    write({ ...form, inventoryCategoryId: category.id, inventoryCategoryName: category.name });
  };

  const setDescription = (description: string) => write({ ...form, description });

  /** `after` fires once the save succeeds — used by the New Product wizard to advance to the
   * next step only on a confirmed save, without duplicating this request. Colours/sizes are no
   * longer sent here — they (and the variants they generate) are now owned by the Colour & size
   * adjustment modal's own Replace/Insert (`useColourSizeModal.apply`), so a details Save can't
   * clobber a change that modal just made. */
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
        inventoryCategoryId: form.inventoryCategoryId,
        sku: form.sku,
        description: form.description,
        productRemark: form.productRemark,
        poQuantity: Number(form.poQuantity) || 1,
        status: form.status,
        verified: form.verified,
      },
      validation: async () => {
        const validationErrors: Record<string, string> = {};
        if (!isValidHandle(form.handle.trim())) validationErrors.handle = 'Enter a valid handle (lowercase letters, numbers and dashes)';
        if (form.supplierIds.length === 0) validationErrors.supplierId = 'At least one supplier is required';
        if (!Number.isFinite(Number(form.poQuantity)) || Number(form.poQuantity) < 1) validationErrors.poQuantity = 'Enter a quantity of at least 1';
        return validationErrors;
      },
      successMessage: 'Product details saved',
      onSuccess: ({ data }) => {
        onSaved(data);
        setDraft(null);
        setStoredHandleLocked({ productId: data.id, locked: defaultHandleLocked });
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
    setItemNo,
    handleLocked,
    toggleHandleLock,
    setCategory,
    setInventoryCategory,
    setDescription,
    setStatus: (status: ProductStatusValue) => write({ ...form, status }),
    setVerified: (verified: boolean) => write({ ...form, verified }),
    setSupplierIds: (supplierIds: string[]) => write({ ...form, supplierIds }),
    /** Discards the in-progress draft — the panel itself no longer has a Cancel button (always
     * editable, Save-only), but the New Product wizard's "Skip" still uses this to back out of
     * step 2 without saving. */
    cancelEdit: () => {
      setDraft(null);
      if (product) setStoredHandleLocked({ productId: product.id, locked: defaultHandleLocked });
      setErrors({});
    },
    saveDetails,
    syncListsFromProduct,
    // Effective lists, so the variants matrix reflects an in-progress edit.
    sizes: parseSizesInput(form.sizes),
    colours: parseColoursInput(form.colours),
  };
}
