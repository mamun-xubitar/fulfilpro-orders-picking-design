'use client';

import { useState } from 'react';
import useRequest from '@/hooks/useRequest';
import type { InvoiceDetail } from './invoiceForm';

export type EmailTarget = { id: string; invoiceNumber: string; suggestions: string[] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const messageRequired = (message: string, includeInvoice: boolean): Record<string, string> =>
  !includeInvoice && !message.trim() ? { message: 'Add a message when the invoice is not included' } : {};

/**
 * Opens the email dialog for an invoice (pre-filled with its customer's addresses) or for a
 * selection of invoices (each goes to its own customer), and sends it.
 */
export function useInvoiceEmail(onSent?: (bulk: boolean) => void) {
  const [target, setTarget] = useState<EmailTarget | null>(null);
  const [bulkIds, setBulkIds] = useState<string[] | null>(null);
  const detailReq = useRequest<InvoiceDetail>();
  const sendReq = useRequest();

  const openEmail = (invoiceId: string) =>
    void detailReq.request({
      url: `/api/invoices/${invoiceId}`,
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) => setTarget({ id: data.id, invoiceNumber: data.invoiceNumber, suggestions: data.customerEmails }),
    });

  const close = () => {
    setTarget(null);
    setBulkIds(null);
  };

  const send = (to: string[], message: string, includeInvoice: boolean) => {
    if (!target) return;
    void sendReq.request({
      url: `/api/invoices/${target.id}/email`,
      method: 'POST',
      data: { to, message, includeInvoice },
      validation: async (): Promise<Record<string, string>> => {
        if (to.length === 0) return { to: 'Add at least one recipient' };
        const invalid = to.find((email) => !EMAIL_RE.test(email));
        if (invalid) return { to: `${invalid} is not a valid email address` };
        return messageRequired(message, includeInvoice);
      },
      onSuccess: () => {
        close();
        onSent?.(false);
      },
    });
  };

  const sendBulk = (message: string, includeInvoice: boolean) => {
    if (!bulkIds) return;
    void sendReq.request({
      url: '/api/invoices/email',
      method: 'POST',
      data: { ids: bulkIds, message, includeInvoice },
      validation: async () => messageRequired(message, includeInvoice),
      onSuccess: () => {
        close();
        onSent?.(true);
      },
    });
  };

  return {
    emailTarget: target,
    bulkCount: bulkIds?.length ?? 0,
    openEmail,
    openBulkEmail: (ids: string[]) => setBulkIds(ids),
    closeEmail: close,
    sendEmail: send,
    sendBulkEmail: sendBulk,
    emailLoading: detailReq.loading,
    emailSending: sendReq.loading,
    emailErrors: sendReq.errors,
  };
}
