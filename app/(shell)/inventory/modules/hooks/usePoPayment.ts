'use client';

import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import type { InventoryGlobals, PoPaymentHistoryRecord, PoPaymentRecord, PoPaymentStatusValue, PurchaseOrderRecord } from '../types';

export type PayForm = {
  status: PoPaymentStatusValue;
  currencyCode: string;
  exchangeRate: string;
  buyingPrice: string;
  freight: string;
  misc: string;
  /** yyyy-mm-dd */
  paidAt: string;
  reference: string;
  remark: string;
};

const num = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
const money = (n: number) => String(Math.round(n * 100) / 100);

/** What the form starts as: the PO's saved payment when there is one (edit mode), otherwise the
 * product's own "Pricing & margin" figures (a first pay). */
function seedForm(po: PurchaseOrderRecord, globals: InventoryGlobals): PayForm {
  if (po.payment) {
    const p = po.payment;
    return {
      status: p.status,
      currencyCode: p.currencyCode,
      exchangeRate: String(p.exchangeRate),
      buyingPrice: money(p.buyingPrice),
      freight: money(p.freight),
      misc: money(p.misc),
      paidAt: toDateInput(p.paidAt),
      reference: p.reference ?? '',
      remark: p.remark ?? '',
    };
  }
  const pricing = po.productPricing;
  return {
    status: 'UNPAID',
    currencyCode: pricing?.currencyCode ?? globals.currencies[0]?.code ?? globals.baseCurrency,
    exchangeRate: String(pricing?.exchangeRate ?? 1),
    buyingPrice: money(pricing?.buyingPrice ?? 0),
    freight: money(pricing?.freight ?? 0),
    misc: money(pricing?.misc ?? 0),
    paidAt: '',
    reference: '',
    remark: '',
  };
}

type Args = {
  globals: InventoryGlobals;
  /** Fired after a save so the PO list / payments list / supplier counts refetch. */
  onSaved: () => void;
};

/** The Pay modal: one payment per purchase order, edited in place — a first open seeds from the
 * product's pricing, a later open edits the saved payment. Every save also lands in the payment's
 * history. Shared by the Purchase Orders tab (Pay) and the Payments tab (Edit). */
export function usePoPayment({ globals, onSaved }: Args) {
  const [target, setTarget] = useState<PurchaseOrderRecord | null>(null);
  const [form, setForm] = useState<PayForm | null>(null);
  const [history, setHistory] = useState<PoPaymentHistoryRecord[]>([]);
  const { request, loading: saving, errors } = useRequest<{ payment: PoPaymentRecord; history: PoPaymentHistoryRecord[] }>();
  const { request: requestPo } = useRequest<PurchaseOrderRecord>();
  const { request: requestHistory } = useRequest<{ payment: PoPaymentRecord | null; history: PoPaymentHistoryRecord[] }>();

  const open = (po: PurchaseOrderRecord) => {
    setTarget(po);
    setForm(seedForm(po, globals));
    setHistory([]);
    if (po.payment) {
      requestHistory({ url: `/api/inventory/purchase-orders/${po.id}/payment`, method: 'GET', showToast: false, onSuccess: ({ data }) => setHistory(data.history) });
    }
  };
  /** Opens the modal for a PO the caller only has an id for (the Payments tab). */
  const openById = (purchaseOrderId: string) =>
    requestPo({ url: `/api/inventory/purchase-orders/${purchaseOrderId}`, method: 'GET', showToast: false, onSuccess: ({ data }) => open(data) });
  const close = () => {
    setTarget(null);
    setForm(null);
  };

  const set = (field: keyof PayForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setForm((prev) => {
      if (!prev) return prev;
      // Changing currency pulls that currency's current rate, same as the product's pricing panel.
      if (field === 'currencyCode') return { ...prev, currencyCode: value, exchangeRate: String(globals.currencies.find((c) => c.code === value)?.rate ?? prev.exchangeRate) };
      return { ...prev, [field]: value };
    });
  };

  const quantity = target ? target.items.reduce((sum, i) => sum + i.quantity, 0) : 0;
  const totals = useMemo(() => {
    if (!form) return { goods: 0, total: 0 };
    const goods = quantity * num(form.buyingPrice) * num(form.exchangeRate);
    return { goods, total: goods + num(form.freight) + num(form.misc) };
  }, [form, quantity]);

  /** `markPaid` is the Pay button: saves the form as PAID in one step. */
  const save = (markPaid?: boolean) => {
    if (!target || !form) return;
    const status = markPaid ? 'PAID' : form.status;
    request({
      url: `/api/inventory/purchase-orders/${target.id}/payment`,
      method: 'PUT',
      data: { ...form, status, paidAt: status === 'PAID' ? form.paidAt || undefined : undefined },
      successMessage: status === 'PAID' ? 'Payment saved — marked paid' : 'Payment saved',
      onSuccess: () => {
        close();
        onSaved();
      },
      onError: (err) => {
        if (err.general) toast.error(err.general);
      },
    });
  };

  return { target, form, history, quantity, totals, errors, saving, open, close, set, save, openById, isEdit: Boolean(target?.payment), isPaid: form?.status === 'PAID' };
}

export type PoPaymentState = ReturnType<typeof usePoPayment>;
