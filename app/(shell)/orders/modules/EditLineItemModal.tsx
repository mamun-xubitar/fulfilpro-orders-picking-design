'use client';

import type { EditLineItemModalState } from './types';
import DialogShell from './dialogs/DialogShell';
import { dlgBtn, dlgInput, Field } from './dialogs/dialogUi';

type Props = {
  modal: EditLineItemModalState | null;
  setQuantity: (quantity: number) => void;
  setTitle: (title: string) => void;
  setRestock: (restock: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
};

/** Edit a line item's quantity (and title on custom items) (Admin). */
export default function EditLineItemModal({ modal, setQuantity, setTitle, setRestock, onClose, onConfirm }: Props) {
  if (!modal) return null;
  const { item, titleEditable, title, quantity, minQuantity, restockable, restock, saving, error } = modal;
  const decreasing = quantity < item.qty;
  return (
    <DialogShell
      title="Edit line item"
      width={300}
      busy={saving}
      onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} disabled={saving} className={dlgBtn.ghost}>Cancel</button>
        <button type="button" onClick={onConfirm} disabled={saving} className={dlgBtn.pri}>{saving ? 'Saving…' : 'Save'}</button>
      </>}
    >
      <div className="flex flex-col gap-2">
        <Field label="Title" hint={!titleEditable ? 'Store products keep their title' : undefined}>
          <input type="text" value={title} readOnly={!titleEditable} onChange={(e) => setTitle(e.target.value)} className={`${dlgInput} ${!titleEditable ? 'cursor-not-allowed bg-orders-surface-muted text-orders-text-subtle' : ''}`} />
        </Field>
        <Field label="Quantity" hint={minQuantity > 1 ? `${minQuantity} already fulfilled, quantity can't go lower` : undefined}>
          <span className="inline-flex h-6 w-fit items-center overflow-hidden rounded-[7px] border border-orders-border-strong bg-orders-surface">
            <button type="button" aria-label="Decrease quantity" disabled={quantity <= minQuantity} onClick={() => setQuantity(Math.max(minQuantity, quantity - 1))} className="h-full w-[22px] text-[13px] font-bold text-orders-text-muted hover:bg-orders-divider disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer">−</button>
            <input type="number" min={minQuantity} value={quantity} onChange={(e) => setQuantity(Math.max(minQuantity, Number(e.target.value) || minQuantity))} aria-label="Quantity" className="h-[22px] w-10 border-x border-orders-border bg-transparent text-center text-[11.5px] font-bold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
            <button type="button" aria-label="Increase quantity" onClick={() => setQuantity(quantity + 1)} className="h-full w-[22px] text-[13px] font-bold text-orders-text-muted hover:bg-orders-divider cursor-pointer">+</button>
          </span>
        </Field>
        {restockable && decreasing && (
          <label className="flex cursor-pointer items-center gap-1.5 text-[10.5px] font-semibold text-orders-text-body">
            <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="h-[13px] w-[13px] cursor-pointer rounded-[3px] border-orders-border-strong text-orders-primary" />
            Restock the {item.qty - quantity} removed piece{item.qty - quantity === 1 ? '' : 's'}
          </label>
        )}
        {error && <p className="text-[11px] text-orders-danger">{error}</p>}
      </div>
    </DialogShell>
  );
}
