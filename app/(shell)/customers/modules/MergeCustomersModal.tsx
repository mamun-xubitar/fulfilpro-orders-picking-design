'use client';

import { useState } from 'react';
import { ModalActions, ModalShell } from '@/components/ModalShell';
import { customerCode, type CustomerRow } from './types';

type MergeCustomersModalProps = {
  customers: CustomerRow[];
  merging: boolean;
  onMerge: (primaryId: string) => void;
  onClose: () => void;
};

export default function MergeCustomersModal({ customers, merging, onMerge, onClose }: MergeCustomersModalProps) {
  const [primaryId, setPrimaryId] = useState(customers[0]?.id ?? '');

  return (
    <ModalShell
      title={`Merge ${customers.length} customers`}
      onClose={onClose}
      wide
      disableBackdropClose
      footer={<ModalActions onCancel={onClose} onConfirm={() => onMerge(primaryId)} confirmLabel={merging ? 'Merging...' : 'Merge'} disabled={merging || !primaryId} />}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Choose the customer to keep. The others are removed: their invoices move to the kept customer, and their contacts and shipping addresses are added to its own (a contact with the same email, or an address that matches exactly, is only kept once). Blank company, type and country details on the kept customer are filled in from them.
        </p>
        <ul className="space-y-2">
          {customers.map((customer) => (
            <li key={customer.id}>
              <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${primaryId === customer.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name="primary-customer" checked={primaryId === customer.id} onChange={() => setPrimaryId(customer.id)} className="mt-1" />
                <span className="min-w-0 text-sm">
                  <span className="block font-semibold text-gray-900">{customer.code !== undefined && <span className="mr-1 font-mono text-xs text-gray-500">{customerCode(customer.code)}</span>}{customer.name}{customer.company ? ` — ${customer.company}` : ''}</span>
                  <span className="block text-gray-500">{[customer.email, customer.phone, customer.country].filter(Boolean).join(' · ') || 'No contact details'}</span>
                  <span className="block text-xs text-gray-400">{customer.invoiceCount ?? 0} invoice{customer.invoiceCount === 1 ? '' : 's'}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="text-xs text-amber-700">This cannot be undone.</p>
      </div>
    </ModalShell>
  );
}
