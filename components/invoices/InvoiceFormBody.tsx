'use client';

import type { BillingStore } from '@/hooks/useStoreOptions';
import CustomerPicker from './CustomerPicker';
import { Field, INPUT, SectionTitle } from './fieldStyles';
import InvoiceTotalsPanel from './InvoiceTotalsPanel';
import LineItemsEditor from './LineItemsEditor';
import PaymentsEditor from './PaymentsEditor';
import type { useInvoiceForm } from './useInvoiceForm';

type InvoiceFormBodyProps = {
  f: ReturnType<typeof useInvoiceForm>;
  stores: BillingStore[];
  readOnly: boolean;
};

export default function InvoiceFormBody({ f, stores, readOnly }: InvoiceFormBodyProps) {
  const { form, errors, totals } = f;
  const text = (field: 'invoiceNumber' | 'billToName' | 'shipToName' | 'currencyCode') => (
    <input className={INPUT} value={form[field]} onChange={f.set(field)} />
  );
  const area = (field: 'billToAddress' | 'shipToAddress' | 'notes' | 'terms', rows = 3) => (
    <textarea className={INPUT} rows={rows} value={form[field]} onChange={f.set(field)} />
  );
  const taxLabel = form.taxRegion === 'NONE' ? 'Tax' : `Tax included (${form.taxRate || 0}%)`;

  return (
    <fieldset disabled={readOnly} className="min-w-0 space-y-5">
      {errors.general && <p className="text-sm text-red-600">{errors.general}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Store" error={errors.storeId}>
          <select className={INPUT} value={form.storeId} onChange={(e) => f.changeStore(e.target.value)}>
            <option value="">Choose a store…</option>
            {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
          </select>
        </Field>
        <Field label="Invoice number" error={errors.invoiceNumber} hint="Leave blank to use the next number.">{text('invoiceNumber')}</Field>
        <Field label="Currency" error={errors.currencyCode}>{text('currencyCode')}</Field>
        <Field label="Invoice date" error={errors.issueDate}>
          <input type="date" className={INPUT} value={form.issueDate} onChange={f.set('issueDate')} />
        </Field>
        <Field label="Due date" error={errors.dueDate}>
          <input type="date" className={INPUT} value={form.dueDate} onChange={f.set('dueDate')} />
        </Field>
      </div>

      <SectionTitle>Customer</SectionTitle>
      <CustomerPicker storeId={form.storeId} selectedLabel={form.customerLabel} disabled={readOnly} onPick={f.applyCustomer} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bill to" error={errors.billToName}>{text('billToName')}</Field>
        <Field label="Ship to" hint="Leave blank to use bill to.">{text('shipToName')}</Field>
        <Field label="Bill-to address">{area('billToAddress')}</Field>
        <Field label="Ship-to address">{area('shipToAddress')}</Field>
      </div>

      <SectionTitle>Items</SectionTitle>
      <LineItemsEditor
        storeId={form.storeId}
        currencyCode={form.currencyCode}
        lines={form.lines}
        error={errors.lineItems}
        disabled={readOnly}
        onUpdate={f.updateLine}
        onAdd={f.addLine}
        onRemove={f.removeLine}
      />

      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tax region" hint="Tax is already inside the prices; the total doesn't change.">
            <select className={INPUT} value={form.taxRegion} onChange={f.set('taxRegion')}>
              <option value="AU">Australia</option>
              <option value="NZ">New Zealand</option>
              <option value="NONE">No tax</option>
            </select>
          </Field>
          <Field label="Tax %" error={errors.taxRate}>
            <input type="number" min={0} max={100} step="0.01" className={INPUT} value={form.taxRegion === 'NONE' ? '0' : form.taxRate} disabled={form.taxRegion === 'NONE'} onChange={f.set('taxRate')} />
          </Field>
          <Field label="Shipping" error={errors.shipping}>
            <input type="number" min={0} step="0.01" className={INPUT} value={form.shipping} onChange={f.set('shipping')} />
          </Field>
        </div>
        <InvoiceTotalsPanel totals={totals} currencyCode={form.currencyCode} taxLabel={taxLabel} />
      </div>

      <SectionTitle>Payments</SectionTitle>
      <PaymentsEditor
        payments={form.payments}
        currencyCode={form.currencyCode}
        total={totals.total}
        amountPaid={totals.amountPaid}
        balance={totals.balance}
        error={errors.payments}
        disabled={readOnly}
        onUpdate={f.updatePayment}
        onAdd={f.addPayment}
        onRemove={f.removePayment}
      />

      <Field label="Notes" error={errors.notes}>{area('notes', 2)}</Field>
      <Field label="Invoice terms" error={errors.terms} hint="Printed at the bottom of the invoice.">{area('terms', 4)}</Field>
    </fieldset>
  );
}
