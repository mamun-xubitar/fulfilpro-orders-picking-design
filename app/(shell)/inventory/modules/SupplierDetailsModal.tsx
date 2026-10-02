'use client';

import { useEffect, useState } from 'react';
import { MODAL_FOOTER_BTN_SECONDARY, ModalShell } from '@/components/ModalShell';
import useRequest from '@/hooks/useRequest';
import type { SupplierRow } from './hooks/useSuppliers';
import { formatDate } from './utils';

type SupplierDetailsModalProps = {
  supplierId: string;
  onClose: () => void;
  /** Jump to this supplier's purchase orders / payments (closes the modal). */
  onOpenPurchaseOrders: (supplierId: string) => void;
  onOpenPayments: (supplierId: string) => void;
};

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">{label}</dt>
      <dd className="mt-[2px] break-words text-[12px] text-inventory-text">{children}</dd>
    </div>
  );
}

/** Read-only supplier card, opened by clicking a supplier's name in the PO / Payments tables. */
export default function SupplierDetailsModal({ supplierId, onClose, onOpenPurchaseOrders, onOpenPayments }: SupplierDetailsModalProps) {
  const [supplier, setSupplier] = useState<SupplierRow | null>(null);
  const { request, loading } = useRequest<SupplierRow>();

  useEffect(() => {
    request({ url: `/api/inventory/suppliers/${supplierId}`, method: 'GET', showToast: false, onSuccess: ({ data }) => setSupplier(data) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId]);

  const linkClass = 'font-semibold tabular-nums text-inventory-secondary underline-offset-2 hover:underline cursor-pointer';

  return (
    <ModalShell
      disableBackdropClose
      elevated
      compact
      title={supplier?.name ?? 'Supplier'}
      onClose={onClose}
      maxWidthClass="max-w-[440px]"
      footer={
        <button type="button" onClick={onClose} className={`w-full ${MODAL_FOOTER_BTN_SECONDARY}`}>
          Close
        </button>
      }
    >
      {!supplier ? (
        <div className="space-y-2" aria-busy={loading}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-inventory-surface-muted" />
          ))}
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Item label="PO email">{supplier.poEmail}</Item>
          <Item label="Contact email">{supplier.contactEmail || '—'}</Item>
          <Item label="Products">{supplier.productCount}</Item>
          <Item label="Created">{formatDate(supplier.createdAt)}</Item>
          <Item label="Purchase orders">
            <button type="button" onClick={() => onOpenPurchaseOrders(supplier.id)} className={linkClass}>
              {supplier.purchaseOrderCount}
            </button>
          </Item>
          <Item label="Payments">
            <button type="button" onClick={() => onOpenPayments(supplier.id)} className={linkClass}>
              {supplier.paymentCount}
            </button>
          </Item>
          {supplier.description && (
            <div className="col-span-2">
              <Item label="Description">{supplier.description}</Item>
            </div>
          )}
        </dl>
      )}
    </ModalShell>
  );
}
