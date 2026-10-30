'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { printDocumentInHiddenFrame } from '@/app/(shell)/orders/modules/packingSlipPrint';
import { buildTaxInvoiceDocument } from '@/app/(shell)/orders/modules/taxInvoicePrint';
import type { TaxInvoice } from '@/app/(shell)/orders/modules/types';

/** Prints a manual invoice through the same tax-invoice layout used for Shopify orders. */
export function useInvoicePrint() {
  const [printingId, setPrintingId] = useState<string | null>(null);

  const print = async (invoiceId: string) => {
    setPrintingId(invoiceId);
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}/pdf-data`);
      const json = (await res.json()) as { success: boolean; message: string; data: TaxInvoice };
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load invoice');
      await printDocumentInHiddenFrame(buildTaxInvoiceDocument(json.data, window.location.origin));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load invoice.');
    } finally {
      setPrintingId(null);
    }
  };

  return { printingId, print };
}
