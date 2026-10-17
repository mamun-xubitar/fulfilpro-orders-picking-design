import { useState } from "react";
import { toast } from "react-toastify";
import type { ApiResponse, OrderRow, TaxInvoice } from "../types";
import { printDocumentInHiddenFrame } from "../packingSlipPrint";
import { buildTaxInvoiceDocument } from "../taxInvoicePrint";
import { getApiErrorMessage } from "../utils";

export function useTaxInvoicePrinting() {
  const [printingInvoiceOrderId, setPrintingInvoiceOrderId] = useState<string | null>(null);

  const printTaxInvoice = async (order: OrderRow) => {
    setPrintingInvoiceOrderId(order.id);

    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(order.id)}/tax-invoice`,
      );
      const json = (await res.json()) as ApiResponse<TaxInvoice>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, "Failed to load tax invoice"));
      }

      if (json.data.notice) toast.warning(json.data.notice);

      await printDocumentInHiddenFrame(
        buildTaxInvoiceDocument(json.data, window.location.origin),
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load tax invoice.",
      );
    } finally {
      setPrintingInvoiceOrderId(null);
    }
  };

  return { printingInvoiceOrderId, printTaxInvoice };
}
