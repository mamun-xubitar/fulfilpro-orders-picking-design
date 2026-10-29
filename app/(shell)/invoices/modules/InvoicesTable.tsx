'use client';

import { Copy, Eye, Mail, Pencil, Printer, Trash2, Wallet } from '@/components/icons';
import SortableHeader from '@/components/SortableHeader';
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge';
import { formatMoney } from '@/components/invoices/fieldStyles';
import type { InvoiceListRow } from '@/components/invoices/invoiceForm';
import type { InvoiceSortKey } from './hooks/useInvoicesList';

type InvoicesTableProps = {
  rows: InvoiceListRow[];
  loading: boolean;
  searching: boolean;
  sort: InvoiceSortKey;
  dir: 'asc' | 'desc';
  canWrite: boolean;
  printingId: string | null;
  onSortChange: (key: InvoiceSortKey) => void;
  onView: (row: InvoiceListRow) => void;
  onEdit: (row: InvoiceListRow) => void;
  onCopy: (row: InvoiceListRow) => void;
  onPrint: (row: InvoiceListRow) => void;
  onEmail: (row: InvoiceListRow) => void;
  onPayments: (row: InvoiceListRow) => void;
  onDelete: (row: InvoiceListRow) => void;
};

const TD = 'px-4 py-3 text-sm text-gray-700';
const ICON_BTN = 'rounded-lg p-1.5 text-gray-400 cursor-pointer';
const COLUMNS = 11;

export default function InvoicesTable(props: InvoicesTableProps) {
  const { rows, canWrite } = props;
  const header = (label: string, key: InvoiceSortKey, className?: string) => (
    <SortableHeader label={label} sortKey={key} sort={props.sort} dir={props.dir} onSortChange={props.onSortChange} className={className} />
  );
  const plain = (label: string, className = '') => (
    <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${className}`}>{label}</th>
  );
  const iconButton = (label: string, onClick: () => void, icon: React.ReactNode, hover = 'hover:bg-gray-100 hover:text-gray-600', disabled = false) => (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={`${ICON_BTN} ${hover} disabled:opacity-50`}>{icon}</button>
  );

  return (
    <table className="w-full min-w-[1180px] text-left">
      <thead className="border-b border-gray-200 bg-gray-50">
        <tr>
          {header('Invoice', 'invoiceNumber')}
          {plain('Store')}
          {header('Customer', 'billToName')}
          {plain('Order / PO #')}
          {plain('Qty', 'text-right')}
          {header('Date', 'issueDate')}
          {header('Total', 'total', 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500')}
          {plain('Paid', 'text-right')}
          {header('Balance', 'balance', 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500')}
          {header('Status', 'paymentStatus')}
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody>
        {props.loading && rows.length === 0 ? (
          Array.from({ length: 6 }).map((_, row) => (
            <tr key={row} className="border-b border-gray-100">
              {Array.from({ length: COLUMNS }).map((__, cell) => <td key={cell} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-gray-200" /></td>)}
            </tr>
          ))
        ) : rows.length === 0 ? (
          <tr>
            <td colSpan={COLUMNS} className="px-4 py-10 text-center text-sm text-gray-500">
              {props.searching ? 'No invoices match your filters.' : 'No manual invoices yet — create one to get started.'}
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className={`${TD} font-semibold text-gray-900`}>
                <span className="inline-flex items-center gap-1.5">
                  {row.invoiceNumber}
                  {row.lastEmailedAt && (
                    <span title={`Emailed ${new Date(row.lastEmailedAt).toLocaleString('en-AU')}`} aria-label="Emailed">
                      <Mail className="h-3.5 w-3.5 text-green-600" />
                    </span>
                  )}
                </span>
              </td>
              <td className={TD}>{row.storeName}</td>
              <td className={TD}>{row.billToName}</td>
              <td className={TD}>{row.orderRef || '—'}</td>
              <td className={`${TD} text-right tabular-nums`}>{row.qty}</td>
              <td className={`${TD} whitespace-nowrap`}>{new Date(row.issueDate).toLocaleDateString('en-AU', { timeZone: 'UTC' })}</td>
              <td className={`${TD} text-right tabular-nums`}>{formatMoney(row.total, row.currencyCode)}</td>
              <td className={`${TD} text-right tabular-nums`}>{formatMoney(row.amountPaid, row.currencyCode)}</td>
              <td className={`${TD} text-right tabular-nums`}>{formatMoney(row.balance, row.currencyCode)}</td>
              <td className="px-4 py-3"><InvoiceStatusBadge status={row.paymentStatus} /></td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  {iconButton(`View ${row.invoiceNumber}`, () => props.onView(row), <Eye className="h-4 w-4" />)}
                  {iconButton(`Print ${row.invoiceNumber}`, () => props.onPrint(row), <Printer className="h-4 w-4" />, undefined, props.printingId === row.id)}
                  {canWrite && iconButton(`Payments for ${row.invoiceNumber}`, () => props.onPayments(row), <Wallet className="h-4 w-4" />)}
                  {canWrite && iconButton(`Email ${row.invoiceNumber}`, () => props.onEmail(row), <Mail className={`h-4 w-4 ${row.lastEmailedAt ? 'text-green-600' : ''}`} />, row.lastEmailedAt ? 'hover:bg-green-50' : undefined)}
                  {canWrite && iconButton(`Edit ${row.invoiceNumber}`, () => props.onEdit(row), <Pencil className="h-4 w-4" />)}
                  {canWrite && iconButton(`Copy ${row.invoiceNumber}`, () => props.onCopy(row), <Copy className="h-4 w-4" />)}
                  {canWrite && iconButton(`Delete ${row.invoiceNumber}`, () => props.onDelete(row), <Trash2 className="h-4 w-4" />, 'hover:bg-red-50 hover:text-red-600')}
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
