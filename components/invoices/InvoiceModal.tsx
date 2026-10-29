'use client';

import { ModalShell } from '@/components/ModalShell';
import type { BillingStore } from '@/hooks/useStoreOptions';
import { Mail, Pencil, Printer } from '@/components/icons';
import InvoiceFormBody from './InvoiceFormBody';
import InvoiceView from './InvoiceView';
import type { InvoiceDetail, InvoiceFormValues } from './invoiceForm';
import { useInvoiceForm } from './useInvoiceForm';

export type InvoiceModalMode = 'create' | 'edit' | 'view' | 'copy';

type InvoiceModalProps = {
  mode: InvoiceModalMode;
  initial: InvoiceFormValues;
  invoiceId: string | null;
  stores: BillingStore[];
  title?: string;
  printing?: boolean;
  onSaved: (invoice: InvoiceDetail) => void;
  onPrint?: () => void;
  onEmail?: () => void;
  onEdit?: () => void;
  onClose: () => void;
};

const BTN = 'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60';
const TITLES: Record<InvoiceModalMode, string> = { create: 'New invoice', edit: 'Edit invoice', view: 'Invoice', copy: 'New invoice (copy)' };

/** Create / edit / view / copy a manual invoice. Mount it fresh for each open — it seeds its form from `initial`. */
export default function InvoiceModal({ mode, initial, invoiceId, stores, title, printing, onSaved, onPrint, onEmail, onEdit, onClose }: InvoiceModalProps) {
  const f = useInvoiceForm({ initial, invoiceId, stores, onSaved });
  const readOnly = mode === 'view';

  const footer = (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onClose} className={`${BTN} border border-gray-300 bg-white text-gray-600 hover:bg-gray-50`}>
        {readOnly ? 'Close' : 'Cancel'}
      </button>
      {readOnly && onPrint && (
        <button type="button" onClick={onPrint} disabled={printing} className={`${BTN} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}>
          <Printer className="h-4 w-4" /> {printing ? 'Preparing…' : 'Print'}
        </button>
      )}
      {readOnly && onEmail && (
        <button type="button" onClick={onEmail} className={`${BTN} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}><Mail className="h-4 w-4" /> Email</button>
      )}
      {readOnly && onEdit && (
        <button type="button" onClick={onEdit} className={`${BTN} bg-blue-600 text-white hover:bg-blue-700`}><Pencil className="h-4 w-4" /> Edit</button>
      )}
      {!readOnly && (
        <button type="button" onClick={f.save} disabled={f.saving} className={`${BTN} bg-blue-600 text-white hover:bg-blue-700`}>
          {f.saving ? 'Saving...' : 'Save invoice'}
        </button>
      )}
    </div>
  );

  return (
    <ModalShell title={title ?? TITLES[mode]} onClose={onClose} extraWide disableBackdropClose={!readOnly} footer={footer}>
      {readOnly ? <InvoiceView f={f} stores={stores} /> : <InvoiceFormBody f={f} stores={stores} showNumber={invoiceId !== null} />}
    </ModalShell>
  );
}
