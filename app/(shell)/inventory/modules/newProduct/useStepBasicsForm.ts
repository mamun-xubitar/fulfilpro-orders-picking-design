'use client';

import { useState } from 'react';
import { slugifyHandle } from '@/lib/inventory/handle';
import { useItemNoAvailability } from '../hooks/useItemNoAvailability';
import type { InventoryPage } from '../hooks/useInventoryPage';

export type StepBasicsForm = { supplierIds: string[]; itemNo: string; name: string; brand: string; handle: string };

/** Owns the wizard's step-1 (Basics) form state — the same fields and behaviour as the old
 * standalone New Product modal, just lifted out of the component so both the step's fields and
 * the wizard's own footer buttons (which need `disabled`/`submit`) can share one source of truth. */
export function useStepBasicsForm(p: InventoryPage, onCreated: (id: string) => void) {
  const [form, setForm] = useState<StepBasicsForm>({
    supplierIds: [],
    itemNo: '',
    name: '',
    brand: '',
    handle: '',
  });
  // Locked (the default): the handle field is disabled and re-derives from the product name on
  // every keystroke. Unlocking hands control to the user; re-locking re-derives immediately.
  const [handleLocked, setHandleLocked] = useState(true);

  const set = (field: 'itemNo' | 'brand') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const setName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setForm((prev) => ({ ...prev, name, ...(handleLocked ? { handle: slugifyHandle(name) } : {}) }));
  };
  const setHandle = (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, handle: e.target.value }));
  const setSupplierIds = (supplierIds: string[]) => setForm((prev) => ({ ...prev, supplierIds }));
  const toggleHandleLock = () => {
    setHandleLocked((prev) => {
      const next = !prev;
      if (next) setForm((f) => ({ ...f, handle: slugifyHandle(f.name) }));
      return next;
    });
  };

  const itemNoAvailability = useItemNoAvailability(form.itemNo);

  const disabled =
    form.itemNo.trim() === '' ||
    form.name.trim() === '' ||
    form.supplierIds.length === 0 ||
    form.handle.trim() === '' ||
    itemNoAvailability.taken;

  const submit = () => p.createProduct(form, onCreated);

  return { form, set, setName, setHandle, setSupplierIds, handleLocked, toggleHandleLock, itemNoAvailability, disabled, submit };
}
