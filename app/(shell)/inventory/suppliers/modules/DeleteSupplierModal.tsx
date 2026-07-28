'use client';

import { ModalShell, ModalActions } from '@/components/ModalShell';
import type { SupplierRow } from './types';

type Props = {
  target: SupplierRow | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function DeleteSupplierModal({ target, loading, onConfirm, onCancel }: Props) {
  if (!target) return null;

  return (
    <ModalShell title="Delete supplier" onClose={onCancel}>
      <p className="text-sm text-gray-600 mb-4">
        This permanently deletes &quot;{target.name}&quot; and its {target.productCount} product and {target.collectionCount} collection connection(s). This cannot be undone.
      </p>
      <ModalActions onCancel={onCancel} onConfirm={onConfirm} confirmLabel={loading ? 'Deleting...' : 'Delete'} disabled={loading} danger />
    </ModalShell>
  );
}
