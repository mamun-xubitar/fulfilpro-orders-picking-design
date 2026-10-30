'use client';

import CustomerModal from '@/app/(shell)/customers/modules/CustomerModal';
import { FileText } from '@/components/icons';
import type { BillingStore } from '@/hooks/useStoreOptions';
import { Field, INPUT } from './fieldStyles';
import InvoicePartiesSection from './InvoicePartiesSection';
import InvoiceTaxSection from './InvoiceTaxSection';
import InvoiceZone from './InvoiceZone';
import LineItemsEditor from './LineItemsEditor';
import type { useInvoiceForm } from './useInvoiceForm';

type InvoiceFormBodyProps = {
  f: ReturnType<typeof useInvoiceForm>;
  stores: BillingStore[];
  /** Saved invoices show their number (read-only); a new invoice gets the next number on save. */
  showNumber: boolean;
};

export default function InvoiceFormBody({ f, stores, showNumber }: InvoiceFormBodyProps) {
  const { form, errors } = f;
  const text = (field: 'currencyCode' | 'orderRef') => <input className={`${INPUT} uppercase`} value={form[field]} onChange={f.set(field)} />;
  const area = (field: 'notes' | 'terms', rows: number) => (
    <textarea aria-label={field === 'notes' ? 'Notes' : 'Invoice terms'} className={`${INPUT} uppercase`} rows={rows} value={form[field]} onChange={f.set(field)} />
  );

  return (
    <>
      <div className="min-w-0 space-y-4">
        {errors.general && <p className="text-sm text-red-600">{errors.general}</p>}

        <InvoiceZone title="Invoice details" icon={FileText}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Store" error={errors.storeId}>
              <select className={INPUT} value={form.storeId} onChange={(e) => f.changeStore(e.target.value)}>
                <option value="">Choose a store…</option>
                {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
              </select>
            </Field>
            {showNumber && (
              <Field label="Invoice number" error={errors.invoiceNumber}>
                <input className={INPUT} value={form.invoiceNumber} disabled readOnly />
              </Field>
            )}
            {showNumber && (
              <Field label="Created by">
                <input className={INPUT} value={form.createdByName || '—'} disabled readOnly />
              </Field>
            )}
            <Field label="Currency" error={errors.currencyCode}>{text('currencyCode')}</Field>
            <Field label="Invoice date" error={errors.issueDate}>
              <input type="date" className={INPUT} value={form.issueDate} onChange={f.set('issueDate')} />
            </Field>
            <Field label="Due date" error={errors.dueDate}>
              <input type="date" className={INPUT} value={form.dueDate} onChange={f.set('dueDate')} />
            </Field>
            <Field label="Order / PO #" error={errors.orderRef} hint="The customer's own order reference.">{text('orderRef')}</Field>
          </div>
        </InvoiceZone>

        <InvoicePartiesSection f={f} />

        <LineItemsEditor
          storeId={form.storeId}
          currencyCode={form.currencyCode}
          lines={form.lines}
          error={errors.lineItems}
          onUpdate={f.updateLine}
          onAdd={f.addLine}
          onRemove={f.removeLine}
        />

        <InvoiceTaxSection f={f} />

        <div className="grid items-start gap-3 lg:grid-cols-2">
          <InvoiceZone title="Notes" icon={FileText}>
            {area('notes', 3)}
            {errors.notes && <p className="mt-1 text-xs text-red-500">{errors.notes}</p>}
          </InvoiceZone>
          <InvoiceZone title="Invoice terms" icon={FileText}>
            {area('terms', 3)}
            {errors.terms ? <p className="mt-1 text-xs text-red-500">{errors.terms}</p> : <p className="mt-1 text-xs text-gray-400">Printed at the bottom of the invoice.</p>}
          </InvoiceZone>
        </div>
      </div>
      {f.newCustomer.open && (
        <CustomerModal
          source="system"
          editing={false}
          form={f.newCustomer.form}
          errors={f.newCustomer.errors}
          saving={f.newCustomer.saving}
          stores={stores}
          onChange={f.newCustomer.set}
          onContactsChange={f.newCustomer.setContacts}
          onAddressesChange={f.newCustomer.setAddresses}
          onSave={f.newCustomer.save}
          onClose={f.newCustomer.close}
        />
      )}
    </>
  );
}
