'use client';

import { ModalShell, ModalActions } from '@/components/ModalShell';
import type { EditLineItemModalState } from './types';

type Props = {
  modal: EditLineItemModalState | null;
  setQuantity: (quantity: number) => void;
  setTitle: (title: string) => void;
  setRestock: (restock: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export default function EditLineItemModal({ modal, setQuantity, setTitle, setRestock, onClose, onConfirm }: Props) {
  if (!modal) return null;
  const { item, titleEditable, title, quantity, minQuantity, restockable, restock, saving, error } = modal;
  const isDecreasing = quantity < item.qty;

  return (
    <ModalShell
      title="Edit line item"
      onClose={onClose}
      footer={<ModalActions onCancel={onClose} onConfirm={onConfirm} confirmLabel={saving ? 'Saving...' : 'Save'} disabled={saving} />}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Title</label>
          <input
            type="text"
            value={title}
            readOnly={!titleEditable}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm ${!titleEditable ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
          />
          {!titleEditable && (
            <p className="mt-1 text-xs text-gray-400">Title can only be changed on custom items</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Quantity</label>
          <input
            type="number"
            min={minQuantity}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(minQuantity, Number(e.target.value) || minQuantity))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          {minQuantity > 1 && (
            <p className="mt-1 text-xs text-gray-400">{minQuantity} already fulfilled — quantity can&apos;t go lower</p>
          )}
        </div>
        {restockable && isDecreasing && (
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={restock}
              onChange={(e) => setRestock(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 cursor-pointer"
            />
            Return removed items to inventory
          </label>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </ModalShell>
  );
}
