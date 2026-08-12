'use client';

import { ModalShell, ModalActions } from '@/components/ModalShell';
import type { DeleteLineItemModalState } from './types';

type Props = {
  modal: DeleteLineItemModalState | null;
  setModal: React.Dispatch<React.SetStateAction<DeleteLineItemModalState | null>>;
  onClose: () => void;
  onConfirm: () => void;
};

export default function DeleteLineItemModal({ modal, setModal, onClose, onConfirm }: Props) {
  if (!modal) return null;
  const { item, restockable, restock, saving, error } = modal;

  return (
    <ModalShell
      title="Remove line item"
      onClose={onClose}
      footer={<ModalActions onCancel={onClose} onConfirm={onConfirm} confirmLabel={saving ? 'Removing...' : 'Remove'} disabled={saving} danger />}
    >
      <p className="text-sm text-gray-600 mb-4">
        This removes &quot;{item.title ?? item.name}&quot; ({item.qty}) from the Shopify order. This cannot be undone.
      </p>
      {restockable && (
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={restock}
            onChange={(e) => setModal((prev) => (prev ? { ...prev, restock: e.target.checked } : prev))}
            className="rounded border-gray-300 text-blue-600 cursor-pointer"
          />
          Return items to inventory
        </label>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </ModalShell>
  );
}
