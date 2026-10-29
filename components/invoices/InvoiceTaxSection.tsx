'use client';

import { Wallet } from '@/components/icons';
import type { TaxRegion } from '@/lib/invoice-totals';
import { Field, INPUT, formatMoney } from './fieldStyles';
import InvoiceTotalsPanel from './InvoiceTotalsPanel';
import InvoiceZone from './InvoiceZone';
import type { useInvoiceForm } from './useInvoiceForm';

type InvoiceTaxSectionProps = { f: ReturnType<typeof useInvoiceForm> };

/** Tax region, rate and shipping beside the totals they feed. */
export default function InvoiceTaxSection({ f }: InvoiceTaxSectionProps) {
  const { form, errors, totals } = f;
  const taxLabel = form.taxRegion === 'NONE' ? 'Tax' : `Tax included (${form.taxRate || 0}%)`;

  return (
    <div className="grid items-start gap-3 lg:grid-cols-[1fr_20rem]">
      <InvoiceZone title="Tax & shipping" icon={Wallet}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Tax region">
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
        <p className="mt-2 text-xs text-gray-400">Tax is already inside the prices; the total doesn&apos;t change.</p>
      </InvoiceZone>
      <InvoiceTotalsPanel
        totals={totals}
        currencyCode={form.currencyCode}
        taxLabel={taxLabel}
        warning={f.creditWarning && `Over credit limit: ${formatMoney(f.creditWarning.owing, form.currencyCode)} owing against a ${formatMoney(f.creditWarning.limit, form.currencyCode)} limit.`}
      />
    </div>
  );
}
