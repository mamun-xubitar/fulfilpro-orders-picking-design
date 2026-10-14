'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import type { InventoryGlobals, PurchaseOrderRecord } from '../types';
import { seedForm, type PayForm } from './usePoPayment';

/** The cost fields the bulk modal edits per row (status is always PAID). */
export type BulkPayField = 'currencyCode' | 'exchangeRate' | 'buyingPrice' | 'freight' | 'misc' | 'paidAt' | 'reference' | 'remark';

type Args = {
  globals: InventoryGlobals;
  /** Fired after a save so the PO list / payments list / supplier counts refetch. */
  onSaved: () => void;
};

/** The Bulk pay modal: every unpaid selected purchase order gets its own Pay form (seeded like the
 * single Pay modal), with column-wide fills, and all of them are marked paid in one request. */
export function useBulkPoPayment({ globals, onSaved }: Args) {
  const [targets, setTargets] = useState<PurchaseOrderRecord[] | null>(null);
  const [forms, setForms] = useState<Record<string, PayForm>>({});
  const [skipped, setSkipped] = useState(0);
  const { request, loading: saving, errors } = useRequest<{ paid: number; skipped: number }>();

  const open = (pos: PurchaseOrderRecord[]) => {
    const unpaid = pos.filter((po) => po.payment?.status !== 'PAID');
    if (unpaid.length === 0) {
      toast.info('Every selected purchase order is already paid');
      return;
    }
    setTargets(unpaid);
    setSkipped(pos.length - unpaid.length);
    setForms(Object.fromEntries(unpaid.map((po) => [po.id, seedForm(po, globals)])));
  };
  const close = () => setTargets(null);

  /** Changing currency pulls that currency's current rate, same as the single Pay modal. */
  const patch = (form: PayForm, field: BulkPayField, value: string): PayForm =>
    field === 'currencyCode'
      ? { ...form, currencyCode: value, exchangeRate: String(globals.currencies.find((c) => c.code === value)?.rate ?? form.exchangeRate) }
      : { ...form, [field]: value };
  const setField = (poId: string, field: BulkPayField, value: string) => setForms((prev) => ({ ...prev, [poId]: patch(prev[poId], field, value) }));
  const setAll = (field: BulkPayField, value: string) => setForms((prev) => Object.fromEntries(Object.entries(prev).map(([id, form]) => [id, patch(form, field, value)])));

  const submit = () => {
    if (!targets) return;
    request({
      url: '/api/inventory/purchase-orders/bulk-payment',
      method: 'POST',
      data: { payments: targets.map((po) => ({ purchaseOrderId: po.id, ...forms[po.id], paidAt: forms[po.id].paidAt || undefined })) },
      onSuccess: () => {
        close();
        onSaved();
      },
    });
  };

  return { targets, forms, skipped, saving, errors, open, close, setField, setAll, submit };
}

export type BulkPoPaymentState = ReturnType<typeof useBulkPoPayment>;
