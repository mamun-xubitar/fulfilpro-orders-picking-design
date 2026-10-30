'use client';

import Link from 'next/link';
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge';
import { formatMoney } from '@/components/invoices/fieldStyles';
import type { InvoiceHistory } from './hooks/useCustomerActions';

type CustomerInvoiceHistoryProps = {
  history: InvoiceHistory | null;
  loading: boolean;
  onPage: (page: number) => void;
};

const date = (value: string) => new Date(value).toLocaleDateString('en-AU', { timeZone: 'UTC' });
const TH = 'px-2 py-1.5 font-semibold';

/** The customer's manual invoices, newest first, ten to a page. Each number opens the invoice. */
export default function CustomerInvoiceHistory({ history, loading, onPage }: CustomerInvoiceHistoryProps) {
  if (!history) return <div className="h-16 animate-pulse rounded-lg bg-gray-100" />;
  if (history.invoices.length === 0) return <p className="text-sm text-gray-500">No invoices for this customer yet.</p>;
  const { page, totalPages, total } = history.pagination;

  return (
    <div className={loading ? 'opacity-60' : ''}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className={TH}>Invoice #</th>
              <th className={TH}>Order / PO #</th>
              <th className={TH}>Date</th>
              <th className={`${TH} text-right`}>Total</th>
              <th className={`${TH} text-right`}>Paid</th>
              <th className={`${TH} text-right`}>Balance</th>
              <th className={`${TH} text-right`}>Qty</th>
              <th className={TH}>Status</th>
              <th className={TH}>Created by</th>
            </tr>
          </thead>
          <tbody>
            {history.invoices.map((invoice) => (
              <tr key={invoice.id} className="border-t border-gray-100">
                <td className="px-2 py-2 font-semibold">
                  <Link href={`/invoices?view=${invoice.id}`} className="text-blue-600 hover:underline">{invoice.invoiceNumber}</Link>
                </td>
                <td className="px-2">{invoice.orderRef || '—'}</td>
                <td className="px-2 whitespace-nowrap">{date(invoice.issueDate)}</td>
                <td className="px-2 text-right tabular-nums">{formatMoney(invoice.total, invoice.currencyCode)}</td>
                <td className="px-2 text-right tabular-nums">{formatMoney(invoice.amountPaid, invoice.currencyCode)}</td>
                <td className="px-2 text-right tabular-nums">{formatMoney(invoice.balance, invoice.currencyCode)}</td>
                <td className="px-2 text-right tabular-nums">{invoice.qty}</td>
                <td className="px-2"><InvoiceStatusBadge status={invoice.paymentStatus} /></td>
                <td className="px-2">{invoice.createdByName || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>{total} invoices · page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1 || loading} onClick={() => onPage(page - 1)} className="rounded-lg border border-gray-200 px-2 py-1 disabled:opacity-40 cursor-pointer">Previous</button>
            <button type="button" disabled={page >= totalPages || loading} onClick={() => onPage(page + 1)} className="rounded-lg border border-gray-200 px-2 py-1 disabled:opacity-40 cursor-pointer">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
