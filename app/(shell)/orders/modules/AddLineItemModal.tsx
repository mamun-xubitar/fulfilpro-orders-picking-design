'use client';

import VariantPicker from './VariantPicker';
import type { AddLineItemModalState, VariantSearchResult } from './types';
import DialogShell from './dialogs/DialogShell';
import { dlgBtn, dlgInput, Field } from './dialogs/dialogUi';

type Props = {
  modal: AddLineItemModalState | null;
  setMode: (mode: 'variant' | 'custom') => void;
  setQuery: (query: string) => void;
  selectVariant: (variant: VariantSearchResult | null) => void;
  setQuantity: (quantity: number) => void;
  setCustomTitle: (title: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

/** Add a store product or a custom item to the order (Admin). */
export default function AddLineItemModal({ modal, setMode, setQuery, selectVariant, setQuantity, setCustomTitle, onClose, onConfirm }: Props) {
  if (!modal) return null;
  const { mode, query, results, searching, selectedVariant, customTitle, quantity, saving, error } = modal;
  const seg = (on: boolean) => `h-6 flex-1 rounded-md px-2 text-[11px] font-bold cursor-pointer ${on ? 'bg-orders-surface text-orders-text shadow-orders' : 'text-orders-text-muted hover:text-orders-text'}`;
  return (
    <DialogShell
      title="Add line item"
      width={340}
      busy={saving}
      allowOverflow
      onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} disabled={saving} className={dlgBtn.ghost}>Cancel</button>
        <button type="button" onClick={onConfirm} disabled={saving} className={dlgBtn.pri}>{saving ? 'Adding…' : 'Add'}</button>
      </>}
    >
      <div className="flex flex-col gap-2">
        <div role="tablist" className="flex gap-0.5 rounded-lg border border-orders-border bg-orders-divider p-0.5">
          <button type="button" role="tab" aria-selected={mode === 'variant'} onClick={() => setMode('variant')} className={seg(mode === 'variant')}>Store product</button>
          <button type="button" role="tab" aria-selected={mode === 'custom'} onClick={() => setMode('custom')} className={seg(mode === 'custom')}>Custom item</button>
        </div>
        {mode === 'variant' ? (
          <VariantPicker query={query} results={results} searching={searching} selectedVariant={selectedVariant} currencyCode={modal.currencyCode} setQuery={setQuery} selectVariant={selectVariant} />
        ) : (
          <Field label="Title"><input type="text" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} className={dlgInput} /></Field>
        )}
        <Field label="Quantity">
          <span className="inline-flex h-6 w-fit items-center overflow-hidden rounded-[7px] border border-orders-border-strong bg-orders-surface">
            <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-full w-[22px] text-[13px] font-bold text-orders-text-muted hover:bg-orders-divider disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer">−</button>
            <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} aria-label="Quantity" className="h-[22px] w-10 border-x border-orders-border bg-transparent text-center text-[11.5px] font-bold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
            <button type="button" aria-label="Increase quantity" onClick={() => setQuantity(quantity + 1)} className="h-full w-[22px] text-[13px] font-bold text-orders-text-muted hover:bg-orders-divider cursor-pointer">+</button>
          </span>
        </Field>
        {error && <p className="text-[11px] text-orders-danger">{error}</p>}
      </div>
    </DialogShell>
  );
}
