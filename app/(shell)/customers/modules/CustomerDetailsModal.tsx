'use client';

import { ModalShell } from '@/components/ModalShell';
import { formatMoney } from '@/components/invoices/fieldStyles';
import CustomerInvoiceHistory from './CustomerInvoiceHistory';
import type { InvoiceHistory } from './hooks/useCustomerActions';
import { customerCode, type CustomerRow } from './types';

type CustomerDetailsModalProps = {
  customer: CustomerRow;
  history: InvoiceHistory | null;
  historyLoading: boolean;
  onHistoryPage: (page: number) => void;
  onClose: () => void;
};

const TAX_REGION_LABEL: Record<string, string> = { AU: 'Australia', NZ: 'New Zealand', NONE: 'No tax' };

const joinAddress = (row: { address: string | null; address2: string | null; city: string | null; state: string | null; zip: string | null; country: string | null }) =>
  [row.address, row.address2, [row.city, row.state, row.zip].filter(Boolean).join(' '), row.country].filter(Boolean).join('\n');

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-gray-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-sm text-gray-900">{value || '—'}</dd>
    </div>
  );
}

function Stat({ label, value, tone = 'text-gray-900' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 px-3 py-2">
      <div className="text-xs font-medium uppercase text-gray-500">{label}</div>
      <div className={`mt-0.5 text-base font-semibold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 border-b border-gray-100 pb-1 text-sm font-semibold text-gray-900">{title}</h4>
      {children}
    </div>
  );
}

export default function CustomerDetailsModal({ customer, history, historyLoading, onHistoryPage, onClose }: CustomerDetailsModalProps) {
  const system = customer.source === 'system';
  const money = (value: number) => formatMoney(value, customer.currencyCode ?? 'AUD');
  const title = system ? `${customerCode(customer.code)} · ${customer.company || customer.name}` : customer.name;

  return (
    <ModalShell title={title} onClose={onClose} extraWide>
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Total sales" value={money(customer.totalSales)} />
          <Stat label="Balance" value={money(customer.balance)} tone={customer.balance > 0 ? 'text-red-600' : 'text-gray-900'} />
          {system ? (
            <Stat label="Credit limit" value={customer.creditLimit == null ? 'No limit' : money(customer.creditLimit)} />
          ) : (
            <Stat label="Shopify spend" value={money(customer.totalSpent ?? 0)} />
          )}
          {system ? <Stat label="Invoices" value={String(customer.invoiceCount ?? 0)} /> : <Stat label="Shopify orders" value={String(customer.ordersCount ?? 0)} />}
        </div>

        <dl className="grid gap-4 sm:grid-cols-3">
          <Row label="Name" value={customer.name} />
          <Row label="Company" value={customer.company} />
          <Row label="Email" value={customer.email} />
          <Row label="Phone" value={customer.phone} />
          <Row label={system ? 'Billing address' : 'Address'} value={joinAddress(customer)} />
          {system && <Row label="Type" value={customer.type} />}
          {system && <Row label="Invoice defaults" value={`${customer.currencyCode} · ${TAX_REGION_LABEL[customer.taxRegion ?? 'AU'] ?? customer.taxRegion}`} />}
          {!system && <Row label="Store" value={customer.store?.name ?? customer.store?.storeDomain} />}
          <Row label="Notes" value={customer.notes} />
        </dl>

        {system && Boolean(customer.contacts?.length) && (
          <Section title="Contacts">
            <div className="grid gap-3 sm:grid-cols-2">
              {customer.contacts?.map((contact, index) => (
                <div key={index} className="rounded-lg border border-gray-200 p-3 text-sm">
                  <div className="font-semibold text-gray-900">{contact.name}{contact.jobTitle ? <span className="font-normal text-gray-500"> · {contact.jobTitle}</span> : null}</div>
                  <div className="text-gray-600">{[contact.email, contact.phone].filter(Boolean).join(' · ') || '—'}</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {system && Boolean(customer.addresses?.length) && (
          <Section title="Shipping addresses">
            <div className="grid gap-3 sm:grid-cols-2">
              {customer.addresses?.map((address, index) => (
                <div key={index} className="rounded-lg border border-gray-200 p-3 text-sm">
                  <div className="font-semibold text-gray-900">
                    {address.label || address.name}
                    {address.isDefault && <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Default</span>}
                  </div>
                  <div className="whitespace-pre-line text-gray-600">{[address.label ? address.name : null, joinAddress(address), address.phone].filter(Boolean).join('\n')}</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="Invoice history">
          <CustomerInvoiceHistory history={history} loading={historyLoading} onPage={onHistoryPage} />
        </Section>
      </div>
    </ModalShell>
  );
}
