'use client';

import { Eye, Mail, Pencil, Trash2 } from '@/components/icons';
import SortableHeader from '@/components/SortableHeader';
import { formatMoney } from '@/components/invoices/fieldStyles';
import EmailPicker from './EmailPicker';
import { emailOptions, mailtoFor } from './hooks/useEmailPicks';
import { customerCode, type CustomerRow, type CustomerSortKey, type CustomerSource } from './types';

type CustomersTableProps = {
  source: CustomerSource;
  rows: CustomerRow[];
  loading: boolean;
  searching: boolean;
  sort: CustomerSortKey;
  dir: 'asc' | 'desc';
  canWrite: boolean;
  selected: Map<string, CustomerRow>;
  onSortChange: (key: CustomerSortKey) => void;
  onToggleSelected: (row: CustomerRow) => void;
  onTogglePage: (rows: CustomerRow[]) => void;
  onView: (row: CustomerRow) => void;
  onEdit: (row: CustomerRow) => void;
  onDelete: (row: CustomerRow) => void;
  pickedEmails: (row: CustomerRow) => string[];
  onToggleEmail: (row: CustomerRow, email: string) => void;
};

const TD = 'px-4 py-3 text-sm text-gray-700';
const ICON_BTN = 'rounded-lg p-1.5 text-gray-400 cursor-pointer';

const money = (value: number | undefined, currencyCode = 'AUD') => formatMoney(value ?? 0, currencyCode);
const balanceClass = (balance: number) => (balance > 0 ? 'font-semibold text-red-600' : '');

function SkeletonRows({ columns }: { columns: number }) {
  return Array.from({ length: 6 }).map((_, row) => (
    <tr key={row} className="border-b border-gray-100">
      {Array.from({ length: columns }).map((__, cell) => (
        <td key={cell} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-gray-200" /></td>
      ))}
    </tr>
  ));
}

/** Icon button that opens the user's mail app addressed to the picked emails, with the customer as the subject. */
function EmailLink({ row, emails }: { row: CustomerRow; emails: string[] }) {
  if (emails.length === 0) {
    return <span aria-disabled="true" title="Pick at least one email" className={`${ICON_BTN} cursor-not-allowed text-gray-300`}><Mail className="h-4 w-4" /></span>;
  }
  return (
    <a href={mailtoFor(row, emails)} aria-label={`Email ${row.name}`} title={`Email ${emails.join(', ')}`} className={`${ICON_BTN} hover:bg-gray-100 hover:text-gray-600`}>
      <Mail className="h-4 w-4" />
    </a>
  );
}

export default function CustomersTable(props: CustomersTableProps) {
  const { source, rows, canWrite, selected } = props;
  const shopify = source === 'shopify';
  const selectable = canWrite && !shopify;
  const columns = 5 + (shopify ? 4 : 5) + (selectable ? 1 : 0) + 2;
  const pageAllSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
  const header = (label: string, key: CustomerSortKey) => (
    <SortableHeader label={label} sortKey={key} sort={props.sort} dir={props.dir} onSortChange={props.onSortChange} />
  );
  const plainHeader = (label: string) => (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</th>
  );

  return (
    <table className="w-full min-w-[1300px] text-left">
      <thead className="border-b border-gray-200 bg-gray-50">
        <tr>
          {selectable && (
            <th className="w-10 px-4 py-3">
              <input type="checkbox" aria-label="Select all on this page" checked={pageAllSelected} onChange={() => props.onTogglePage(rows)} className="cursor-pointer" />
            </th>
          )}
          {!shopify && header('Code', 'code')}
          {header('Name', 'name')}
          {header('Company', 'company')}
          {header('Email', 'email')}
          {plainHeader('Phone')}
          {header('Country', 'country')}
          {shopify ? (
            <>
              {plainHeader('Store')}
              {header('Orders', 'ordersCount')}
              {header('Total spent', 'totalSpent')}
              {plainHeader('Balance')}
            </>
          ) : (
            <>
              {header('Type', 'type')}
              {plainHeader('Invoices')}
              {plainHeader('Total sales')}
              {plainHeader('Balance')}
            </>
          )}
          {plainHeader('Select email')}
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody>
        {props.loading && rows.length === 0 ? (
          <SkeletonRows columns={columns} />
        ) : rows.length === 0 ? (
          <tr>
            <td colSpan={columns} className="px-4 py-10 text-center text-sm text-gray-500">
              {props.searching ? 'No customers match your search.' : shopify ? 'No Shopify customers yet. An admin can sync them from Shopify.' : 'No customers yet — create one to get started.'}
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
              {selectable && (
                <td className="px-4 py-3">
                  <input type="checkbox" aria-label={`Select ${row.name}`} checked={selected.has(row.id)} onChange={() => props.onToggleSelected(row)} className="cursor-pointer" />
                </td>
              )}
              {!shopify && <td className={`${TD} whitespace-nowrap font-mono text-xs`}>{customerCode(row.code)}</td>}
              <td className={`${TD} font-semibold text-gray-900`}>{row.name}</td>
              <td className={TD}>{row.company || '—'}</td>
              <td className={TD}>{row.email || '—'}</td>
              <td className={TD}>{row.phone || '—'}</td>
              <td className={TD}>{row.country || '—'}</td>
              {shopify ? (
                <>
                  <td className={TD}>{row.store?.name ?? row.store?.storeDomain ?? '—'}</td>
                  <td className={`${TD} tabular-nums`}>{row.ordersCount ?? 0}</td>
                  <td className={`${TD} tabular-nums`}>{money(row.totalSpent)}</td>
                  <td className={`${TD} tabular-nums ${balanceClass(row.balance)}`}>{money(row.balance)}</td>
                </>
              ) : (
                <>
                  <td className={TD}>{row.type || '—'}</td>
                  <td className={`${TD} tabular-nums`}>{row.invoiceCount ?? 0}</td>
                  <td className={`${TD} tabular-nums`}>{money(row.totalSales, row.currencyCode)}</td>
                  <td className={`${TD} tabular-nums ${balanceClass(row.balance)}`}>{money(row.balance, row.currencyCode)}</td>
                </>
              )}
              <td className="px-4 py-3">
                <EmailPicker options={emailOptions(row)} picked={props.pickedEmails(row)} onToggle={(email) => props.onToggleEmail(row, email)} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <EmailLink row={row} emails={props.pickedEmails(row)} />
                  <button type="button" aria-label={`View ${row.name}`} onClick={() => props.onView(row)} className={`${ICON_BTN} hover:bg-gray-100 hover:text-gray-600`}><Eye className="h-4 w-4" /></button>
                  {canWrite && (
                    <>
                      <button type="button" aria-label={`Edit ${row.name}`} onClick={() => props.onEdit(row)} className={`${ICON_BTN} hover:bg-gray-100 hover:text-gray-600`}><Pencil className="h-4 w-4" /></button>
                      <button type="button" aria-label={`Delete ${row.name}`} onClick={() => props.onDelete(row)} className={`${ICON_BTN} hover:bg-red-50 hover:text-red-600`}><Trash2 className="h-4 w-4" /></button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
