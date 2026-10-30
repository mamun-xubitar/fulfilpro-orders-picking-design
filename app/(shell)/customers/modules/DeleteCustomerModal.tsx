'use client';

import { ModalActions, ModalShell } from '@/components/ModalShell';
import type { CustomerRow } from './types';

type DeleteCustomerModalProps = {
  customer: CustomerRow;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function DeleteCustomerModal({ customer, deleting, onConfirm, onClose }: DeleteCustomerModalProps) {
  const shopify = customer.source === 'shopify';
  return (
    <ModalShell
      title="Delete customer"
      onClose={onClose}
      footer={<ModalActions onCancel={onClose} onConfirm={onConfirm} confirmLabel={deleting ? 'Deleting...' : 'Delete'} disabled={deleting} danger />}
    >
      <p className="text-sm text-gray-700">
        Delete <span className="font-semibold">{customer.name}</span>?{' '}
        {shopify
          ? 'This only removes the customer from this system. Nothing changes in Shopify, and a later sync will not bring it back.'
          : 'Invoices already created for this customer keep their bill-to details.'}
      </p>
    </ModalShell>
  );
}
