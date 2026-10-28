'use client';

import { ModalShell } from '@/components/ModalShell';
import type { CustomerRow } from './types';
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge';

const money = (value: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);
const date = (value: string) => new Date(value).toLocaleDateString('en-AU');

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-gray-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-sm text-gray-900">{value || '—'}</dd>
    </div>
  );
}

export default function CustomerDetailsModal({ customer, loading, onClose }: { customer: CustomerRow; loading: boolean; onClose: () => void }) {
  const address = [customer.address, customer.address2, [customer.city, customer.state, customer.zip].filter(Boolean).join(' '), customer.country]
    .filter(Boolean)
    .join('\n');

  return (
    <ModalShell title={customer.name} onClose={onClose} extraWide>
      <div className="space-y-5">
        <dl className="grid gap-4 sm:grid-cols-3">
          <Row label="Company" value={customer.company} />
          <Row label="Email" value={customer.email} />
          <Row label="Phone" value={customer.phone} />
          <Row label="Address" value={address} />
          {customer.source === 'shopify' && <Row label="Store" value={customer.store?.name ?? customer.store?.storeDomain} />}
          {customer.source === 'shopify' && <Row label="Shopify orders" value={String(customer.ordersCount ?? 0)} />}
          <Row label="Notes" value={customer.notes} />
        </dl>

        <div>
          <h4 className="mb-2 border-b border-gray-100 pb-1 text-sm font-semibold text-gray-900">Invoice history</h4>
          {loading && !customer.invoices ? (
            <div className="h-16 animate-pulse rounded-lg bg-gray-100" />
          ) : !customer.invoices?.length ? (
            <p className="text-sm text-gray-500">No invoices for this customer yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-500">
                <tr><th className="py-1">Invoice</th><th>Date</th><th className="text-right">Total</th><th className="text-right">Paid</th><th className="text-right">Balance</th><th className="pl-4">Status</th></tr>
              </thead>
              <tbody>
                {customer.invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-gray-100">
                    <td className="py-2 font-semibold">{invoice.invoiceNumber}</td>
                    <td>{date(invoice.issueDate)}</td>
                    <td className="text-right tabular-nums">{money(invoice.total)}</td>
                    <td className="text-right tabular-nums">{money(invoice.amountPaid)}</td>
                    <td className="text-right tabular-nums">{money(invoice.balance)}</td>
                    <td className="pl-4"><InvoiceStatusBadge status={invoice.paymentStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
