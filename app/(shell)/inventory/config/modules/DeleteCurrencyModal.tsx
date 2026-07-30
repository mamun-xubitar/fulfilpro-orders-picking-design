'use client';

import { ModalShell, ModalActions } from '@/components/ModalShell';
import type { CurrencyRateRow } from './types';

type Props = {
  target: CurrencyRateRow | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function DeleteCurrencyModal({ target, loading, onConfirm, onCancel }: Props) {
  if (!target) return null;

  return (
    <ModalShell
      title="Delete currency"
      onClose={onCancel}
      footer={<ModalActions onCancel={onCancel} onConfirm={onConfirm} confirmLabel={loading ? 'Deleting...' : 'Delete'} disabled={loading} danger />}
    >
      <p className="text-sm text-gray-600 mb-4">
        This permanently deletes the exchange rate for &quot;{target.code}&quot;. This cannot be undone.
      </p>
    </ModalShell>
  );
}
