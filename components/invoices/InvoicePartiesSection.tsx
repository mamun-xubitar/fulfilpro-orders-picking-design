'use client';

import { Receipt, Truck, Users } from '@/components/icons';
import CustomerPicker from './CustomerPicker';
import { Field, INPUT } from './fieldStyles';
import InvoiceZone from './InvoiceZone';
import type { useInvoiceForm } from './useInvoiceForm';

type InvoicePartiesSectionProps = { f: ReturnType<typeof useInvoiceForm> };

/** The customer, then the bill-to (blue) and ship-to (slate) blocks, the same pairing as a customer's contacts and shipping addresses. */
export default function InvoicePartiesSection({ f }: InvoicePartiesSectionProps) {
  const { form, errors, customer } = f;
  const shipTo = customer?.shipTo ?? [];

  return (
    <div className="space-y-3">
      <InvoiceZone title="Customer" icon={Users}>
        <CustomerPicker storeId={form.storeId} selectedLabel={form.customerLabel} onPick={f.applyCustomer} onCreate={() => f.newCustomer.openCreate()} />
        {customer && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${customer.source === 'system' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
              {customer.source === 'system' ? 'System' : 'Shopify'}
            </span>
            <span className="font-semibold text-gray-900">{customer.company || customer.name}</span>
            <span>{customer.email || 'No email on file'}</span>
          </p>
        )}
      </InvoiceZone>
      <div className="grid items-start gap-3 lg:grid-cols-2">
        <InvoiceZone title="Bill to" icon={Receipt} tone="blue" className="h-full">
          <div className="space-y-3">
            <Field label="Name" error={errors.billToName}>
              <input className={`${INPUT} uppercase`} value={form.billToName} onChange={f.set('billToName')} />
            </Field>
            <Field label="Address">
              <textarea className={`${INPUT} uppercase`} rows={4} value={form.billToAddress} onChange={f.set('billToAddress')} />
            </Field>
          </div>
        </InvoiceZone>
        <InvoiceZone
          title="Ship to"
          icon={Truck}
          tone="slate"
          className="h-full"
          action={
            shipTo.length > 1 ? (
              <select aria-label="Choose a shipping address" className="max-w-[14rem] rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" defaultValue="" onChange={(e) => f.chooseShipTo(Number(e.target.value))}>
                <option value="" disabled>Use a customer address…</option>
                {shipTo.map((option, index) => <option key={index} value={index}>{option.label}</option>)}
              </select>
            ) : undefined
          }
        >
          <div className="space-y-3">
            <Field label="Name" hint="Leave blank to use bill to.">
              <input className={`${INPUT} uppercase`} value={form.shipToName} onChange={f.set('shipToName')} />
            </Field>
            <Field label="Address">
              <textarea className={`${INPUT} uppercase`} rows={4} value={form.shipToAddress} onChange={f.set('shipToAddress')} />
            </Field>
          </div>
        </InvoiceZone>
      </div>
    </div>
  );
}
