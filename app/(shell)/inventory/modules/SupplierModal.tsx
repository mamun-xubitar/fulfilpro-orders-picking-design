'use client';

import { ModalShell } from '@/components/ModalShell';
import type { useSuppliers } from './hooks/useSuppliers';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_PRIMARY, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';

type SupplierModalProps = { suppliers: ReturnType<typeof useSuppliers> };

/** Create/edit supplier — the field set is exactly the Supplier model's columns (Shopify has no
 * supplier resource of its own; `vendor` there is a plain product string). */
export default function SupplierModal({ suppliers: s }: SupplierModalProps) {
  if (!s.modalOpen) return null;

  const disabled = s.form.name.trim() === '' || s.form.poEmail.trim() === '';

  return (
    <ModalShell disableBackdropClose
      title={s.editingId ? 'Edit supplier' : 'Add supplier'}
      compact
      onClose={s.closeModal}
      elevated
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={s.closeModal}
            className={`flex-1 ${WIZARD_BTN_SECONDARY}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={s.save}
            disabled={disabled || s.saving}
            className={`flex-1 ${WIZARD_BTN_PRIMARY}`}
          >
            {s.saving && SPINNER}
            {s.saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      }
    >
      <div className={`${WIZARD_CARD_CLASS} space-y-2`}>
        <TextField label="Name" value={s.form.name} onChange={s.set('name')} placeholder="Acme Apparel Co." error={s.saveErrors.name} uppercase />
        <TextField label="PO email" value={s.form.poEmail} onChange={s.set('poEmail')} placeholder="orders@acme.example" error={s.saveErrors.poEmail} />
        <TextField label="Contact email" value={s.form.contactEmail} onChange={s.set('contactEmail')} placeholder="Optional" error={s.saveErrors.contactEmail} />
        <div>
          <label className="mb-[2px] block text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle">Description</label>
          <textarea
            rows={3}
            value={s.form.description}
            onChange={s.set('description')}
            placeholder="Optional notes"
            className="w-full resize-none rounded-[7px] border border-inventory-border-strong px-[6px] py-[4px] text-[11px] leading-tight outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
          />
        </div>
        {s.saveErrors.general && <p className="text-[10px] leading-tight text-inventory-danger">{s.saveErrors.general}</p>}
      </div>
    </ModalShell>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  error,
  uppercase,
}: {
  label: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
  error?: string;
  uppercase?: boolean;
}) {
  return (
    <div>
      <label className="mb-[2px] block text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle">{label}</label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`h-[24px] w-full rounded-[7px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring placeholder:text-inventory-text-subtle placeholder:normal-case ${uppercase ? 'uppercase' : ''}`}
      />
      {error && <p className="mt-1 text-[10px] leading-tight text-inventory-danger">{error}</p>}
    </div>
  );
}
