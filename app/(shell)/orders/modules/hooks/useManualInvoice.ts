import { useState } from "react";
import { useStoreOptions } from "@/hooks/useStoreOptions";
import { blankForm, type InvoiceFormValues } from "@/components/invoices/invoiceForm";

type InvoiceModalState = { initial: InvoiceFormValues; token: number };

/** The Orders page "New invoice" button: opens a blank manual invoice modal. */
export function useManualInvoice({ enabled }: { enabled: boolean }) {
  const stores = useStoreOptions(enabled);
  const [modal, setModal] = useState<InvoiceModalState | null>(null);

  const openNewInvoice = () => setModal({ initial: blankForm(stores[0]), token: Date.now() });

  return { stores, invoiceModal: modal, openNewInvoice, closeInvoiceModal: () => setModal(null) };
}
