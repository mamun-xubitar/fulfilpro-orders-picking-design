'use client';

import { useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { round2 } from '@/lib/invoice-totals';
import { blankPayment, paymentsFromDetail, paymentsTotal, validatePayments, type InvoiceDetail, type PaymentForm } from './invoiceForm';

export type PaymentsTarget = { id: string; invoiceNumber: string; currencyCode: string; total: number };

/** Loads an invoice's payments into the payments modal, edits them and saves them on their own. */
export function useInvoicePayments(onSaved?: () => void) {
  const [target, setTarget] = useState<PaymentsTarget | null>(null);
  const [payments, setPayments] = useState<PaymentForm[]>([]);
  const detailReq = useRequest<InvoiceDetail>();
  const saveReq = useRequest<InvoiceDetail>();

  const open = (invoiceId: string) =>
    void detailReq.request({
      url: `/api/invoices/${invoiceId}`,
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) => {
        saveReq.setErrors({});
        setPayments(paymentsFromDetail(data));
        setTarget({ id: data.id, invoiceNumber: data.invoiceNumber, currencyCode: data.currencyCode, total: data.total });
      },
    });

  const amountPaid = round2(paymentsTotal(payments));
  const balance = round2((target?.total ?? 0) - amountPaid);

  const update = (key: string, values: Partial<PaymentForm>) =>
    setPayments((prev) => prev.map((payment) => (payment.key === key ? { ...payment, ...values } : payment)));
  // A new payment starts with what is still owing, like the old system's "BA" button.
  const add = () => setPayments((prev) => [...prev, { ...blankPayment(), amount: balance > 0 ? String(balance) : '' }]);
  const remove = (key: string) => setPayments((prev) => prev.filter((payment) => payment.key !== key));

  const save = () => {
    if (!target) return;
    void saveReq.request({
      url: `/api/invoices/${target.id}/payments`,
      method: 'PUT',
      data: { payments: payments.map(({ key, ...payment }) => (void key, payment)) },
      validation: async () => validatePayments(payments),
      onSuccess: () => {
        setTarget(null);
        onSaved?.();
      },
    });
  };

  return {
    paymentsTarget: target,
    payments,
    amountPaid,
    balance,
    openPayments: open,
    closePayments: () => setTarget(null),
    updatePayment: update,
    addPayment: add,
    removePayment: remove,
    savePayments: save,
    paymentsLoading: detailReq.loading,
    paymentsSaving: saveReq.loading,
    paymentsErrors: saveReq.errors,
  };
}
