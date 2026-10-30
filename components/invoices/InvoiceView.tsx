import { FileText, Package, Receipt, Truck } from '@/components/icons';
import type { BillingStore } from '@/hooks/useStoreOptions';
import { derivePaymentStatus, lineAmount } from '@/lib/invoice-totals';
import { formatMoney } from './fieldStyles';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import InvoiceTotalsPanel from './InvoiceTotalsPanel';
import InvoiceZone from './InvoiceZone';
import type { useInvoiceForm } from './useInvoiceForm';

type InvoiceViewProps = { f: ReturnType<typeof useInvoiceForm>; stores: BillingStore[] };

const num = (value: string) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const day = (value: string) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const TH = 'px-3 py-2 text-xs font-semibold uppercase text-gray-500';

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase text-gray-500">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-gray-900">{value || '—'}</dd>
    </div>
  );
}

function Party({ name, address, extra }: { name: string; address: string; extra?: string | null }) {
  return (
    <div className="space-y-1 text-sm">
      <p className="font-semibold uppercase text-gray-900">{name || '—'}</p>
      <p className="whitespace-pre-line uppercase text-gray-700">{address || 'No address'}</p>
      {extra && <p className="text-gray-500">{extra}</p>}
    </div>
  );
}

/** A saved invoice laid out as a document: header with status, dates, parties, items and totals. Nothing here is editable. */
export default function InvoiceView({ f, stores }: InvoiceViewProps) {
  const { form, totals, customer } = f;
  const money = (value: number) => formatMoney(value, form.currencyCode);
  const status = derivePaymentStatus(totals.total, totals.amountPaid);
  const storeName = stores.find((store) => store.id === form.storeId)?.name;
  const taxLabel = form.taxRegion === 'NONE' ? 'Tax' : `Tax included (${form.taxRate || 0}%)`;

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-gray-500"><FileText className="h-3.5 w-3.5" /> Invoice</p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums text-gray-900">{form.invoiceNumber}</p>
          {storeName && <p className="text-sm text-gray-500">{storeName}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <InvoiceStatusBadge status={status} />
          <div className="text-right">
            <p className="text-xs font-medium uppercase text-gray-500">Total</p>
            <p className="text-lg font-semibold tabular-nums text-gray-900">{money(totals.total)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase text-gray-500">Balance</p>
            <p className={`text-lg font-semibold tabular-nums ${totals.balance > 0 ? 'text-red-600' : 'text-green-700'}`}>{money(totals.balance)}</p>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-xl border border-gray-200 px-4 py-3 sm:grid-cols-5">
        <Meta label="Invoice date" value={day(form.issueDate)} />
        <Meta label="Due date" value={day(form.dueDate)} />
        <Meta label="Currency" value={form.currencyCode} />
        <Meta label="Order / PO #" value={form.orderRef} />
        <Meta label="Created by" value={form.createdByName} />
      </dl>

      <div className="grid items-start gap-3 lg:grid-cols-2">
        <InvoiceZone title="Bill to" icon={Receipt} tone="blue" className="h-full">
          <Party name={form.billToName} address={form.billToAddress} extra={customer?.email} />
        </InvoiceZone>
        <InvoiceZone title="Ship to" icon={Truck} tone="slate" className="h-full">
          <Party name={form.shipToName || form.billToName} address={form.shipToAddress || form.billToAddress} />
        </InvoiceZone>
      </div>

      <InvoiceZone title="Items" icon={Package} flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className={TH}>Item</th>
                <th className={`${TH} text-right`}>Qty</th>
                <th className={`${TH} text-right`}>Price</th>
                <th className={`${TH} text-right`}>Dis %</th>
                <th className={`${TH} text-right`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {form.lines.map((line) => (
                <tr key={line.key} className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <p className="font-medium uppercase text-gray-900">{line.title || '—'}</p>
                    {(line.size || line.sku) && <p className="text-xs uppercase text-gray-500">{[line.size, line.sku].filter(Boolean).join(' · ')}</p>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{num(line.qty)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{money(num(line.unitPrice))}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{num(line.discountPercent) ? `${num(line.discountPercent)}%` : '—'}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-gray-900">
                    {money(lineAmount({ qty: num(line.qty), unitPrice: num(line.unitPrice), discountPercent: num(line.discountPercent) }))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InvoiceZone>

      <div className="grid items-start gap-3 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-3">
          {form.notes && (
            <InvoiceZone title="Notes" icon={FileText}>
              <p className="whitespace-pre-line text-sm uppercase text-gray-700">{form.notes}</p>
            </InvoiceZone>
          )}
          {form.terms && (
            <InvoiceZone title="Invoice terms" icon={FileText}>
              <p className="whitespace-pre-line text-sm uppercase text-gray-700">{form.terms}</p>
            </InvoiceZone>
          )}
        </div>
        <InvoiceTotalsPanel totals={totals} currencyCode={form.currencyCode} taxLabel={taxLabel} />
      </div>
    </div>
  );
}
