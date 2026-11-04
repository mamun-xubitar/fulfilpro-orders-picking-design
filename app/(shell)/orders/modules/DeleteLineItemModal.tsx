'use client';

import type { DeleteLineItemModalState } from './types';
import DialogShell from './dialogs/DialogShell';
import { dlgBtn } from './dialogs/dialogUi';

type Props = {
  modal: DeleteLineItemModalState | null;
  setModal: React.Dispatch<React.SetStateAction<DeleteLineItemModalState | null>>;
  onClose: () => void;
  onConfirm: () => void;
};

/** Remove a line item from the Shopify order (Admin). */
export default function DeleteLineItemModal({ modal, setModal, onClose, onConfirm }: Props) {
  if (!modal) return null;
  const { item, restockable, restock, saving, error } = modal;
  return (
    <DialogShell
      title="Remove line item"
      width={300}
      busy={saving}
      onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} disabled={saving} className={dlgBtn.ghost}>Cancel</button>
        <button type="button" onClick={onConfirm} disabled={saving} className={dlgBtn.danger}>{saving ? 'Removing…' : 'Remove'}</button>
      </>}
    >
      <p className="leading-[1.5] text-orders-text-muted">Remove <b className="text-orders-text">{item.title ?? item.name} × {item.qty}</b> from the Shopify order? The customer&apos;s total changes in Shopify. This cannot be undone.</p>
      {restockable && (
        <label className="mt-2 flex cursor-pointer items-center gap-1.5 text-[10.5px] font-semibold text-orders-text-body">
          <input type="checkbox" checked={restock} onChange={(e) => setModal((prev) => (prev ? { ...prev, restock: e.target.checked } : prev))} className="h-[13px] w-[13px] cursor-pointer rounded-[3px] border-orders-border-strong text-orders-primary" />
          Return items to hub stock
        </label>
      )}
      {error && <p className="mt-2 text-[11px] text-orders-danger">{error}</p>}
    </DialogShell>
  );
}
