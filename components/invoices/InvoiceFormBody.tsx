'use client';

import CustomerModal from '@/app/(shell)/customers/modules/CustomerModal';
import type { BillingStore } from '@/hooks/useStoreOptions';
import type { TaxRegion } from '@/lib/invoice-totals';
import CustomerPicker from './CustomerPicker';
import { Field, INPUT, SectionTitle, formatMoney } from './fieldStyles';
import InvoiceTotalsPanel from './InvoiceTotalsPanel';
import LineItemsEditor from './LineItemsEditor';
import type { useInvoiceForm } from './useInvoiceForm';

type InvoiceFormBodyProps = {
  f: ReturnType<typeof useInvoiceForm>;
  stores: BillingStore[];
  readOnly: boolean;
  /** Saved invoices show their number (read-only); a new invoice gets the next number on save. */
  showNumber: boolean;
};

export default function InvoiceFormBody({ f, stores, readOnly, showNumber }: InvoiceFormBodyProps) {
  const { form, errors, totals } = f;
  const shipTo = f.customer?.shipTo ?? [];
  const text = (field: 'billToName' | 'shipToName' | 'currencyCode' | 'orderRef') => (
    <input className={`${INPUT} uppercase`} value={form[field]} onChange={f.set(field)} />
  );
  const area = (field: 'billToAddress' | 'shipToAddress' | 'notes' | 'terms', rows = 3) => (
    <textarea className={`${INPUT} uppercase`} rows={rows} value={form[field]} onChange={f.set(field)} />
  );
  const taxLabel = form.taxRegion === 'NONE' ? 'Tax' : `Tax included (${form.taxRate || 0}%)`;

  return (
    <>
    <fieldset disabled={readOnly} className="min-w-0 space-y-5">
      {errors.general && <p className="text-sm text-red-600">{errors.general}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
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

      <SectionTitle>Customer</SectionTitle>
      <CustomerPicker storeId={form.storeId} selectedLabel={form.customerLabel} disabled={readOnly} onPick={f.applyCustomer} onCreate={() => f.newCustomer.openCreate()} />
      {f.customer && (
        <Field label="Email">
          <input className={INPUT} value={f.customer.email ?? ''} placeholder="No email on file" disabled readOnly />
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bill to" error={errors.billToName}>{text('billToName')}</Field>
        <Field label="Ship to" hint="Leave blank to use bill to.">{text('shipToName')}</Field>
        <Field label="Bill-to address">{area('billToAddress')}</Field>
        <Field label="Ship-to address">
          {!readOnly && shipTo.length > 1 && (
            <select aria-label="Choose a shipping address" className={`${INPUT} mb-2`} defaultValue="" onChange={(e) => f.chooseShipTo(Number(e.target.value))}>
              <option value="" disabled>Use one of the customer&apos;s addresses…</option>
              {shipTo.map((option, index) => <option key={index} value={index}>{option.label}</option>)}
            </select>
          )}
          {area('shipToAddress')}
        </Field>
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
            <select className={INPUT} value={form.taxRegion} onChange={(e) => f.changeTaxRegion(e.target.value as TaxRegion)}>
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
        <InvoiceTotalsPanel
          totals={totals}
          currencyCode={form.currencyCode}
          taxLabel={taxLabel}
          warning={f.creditWarning && `Over credit limit: ${formatMoney(f.creditWarning.owing, form.currencyCode)} owing against a ${formatMoney(f.creditWarning.limit, form.currencyCode)} limit.`}
        />
      </div>

      <Field label="Notes" error={errors.notes}>{area('notes', 2)}</Field>
      <Field label="Invoice terms" error={errors.terms} hint="Printed at the bottom of the invoice.">{area('terms', 4)}</Field>
    </fieldset>
    {f.newCustomer.open && !readOnly && (
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
