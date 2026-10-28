'use client';

import { useState } from 'react';
import useRequest from '@/hooks/useRequest';
import type { InvoiceDetail } from './invoiceForm';

export type EmailTarget = { id: string; invoiceNumber: string; suggestions: string[] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Opens the email dialog for an invoice (pre-filled with its customer's addresses) and sends it. */
export function useInvoiceEmail(onSent?: () => void) {
  const [target, setTarget] = useState<EmailTarget | null>(null);
  const detailReq = useRequest<InvoiceDetail>();
  const sendReq = useRequest();

  const openEmail = (invoiceId: string) =>
    void detailReq.request({
      url: `/api/invoices/${invoiceId}`,
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) => setTarget({ id: data.id, invoiceNumber: data.invoiceNumber, suggestions: data.customerEmails }),
    });

  const send = (to: string[], message: string) => {
    if (!target) return;
    void sendReq.request({
      url: `/api/invoices/${target.id}/email`,
      method: 'POST',
      data: { to, message },
      validation: async (): Promise<Record<string, string>> => {
        if (to.length === 0) return { to: 'Add at least one recipient' };
        const invalid = to.find((email) => !EMAIL_RE.test(email));
        return invalid ? { to: `${invalid} is not a valid email address` } : {};
      },
      onSuccess: () => {
        setTarget(null);
        onSent?.();
      },
    });
  };

  return {
    emailTarget: target,
    openEmail,
    closeEmail: () => setTarget(null),
    sendEmail: send,
    emailLoading: detailReq.loading,
    emailSending: sendReq.loading,
    emailErrors: sendReq.errors,
  };
}
