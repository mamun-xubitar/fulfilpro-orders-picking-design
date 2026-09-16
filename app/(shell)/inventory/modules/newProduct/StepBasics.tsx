'use client';

import SupplierMultiSelect from '../SupplierMultiSelect';
import { Check, Close, Lock, Unlock } from '../icons';
import type { InventoryPage } from '../hooks/useInventoryPage';
import type { useStepBasicsForm } from './useStepBasicsForm';

type StepBasicsProps = {
  p: InventoryPage;
  basics: ReturnType<typeof useStepBasicsForm>;
};

/** Step 1 of the New Product wizard — the product's core identity, exactly the fields (and the
 * same visual design) as the standalone New Product modal this replaced. Creating the product is
 * what advances the wizard to step 2 — see NewProductWizard's footer. */
export default function StepBasics({ p, basics: form }: StepBasicsProps) {
  return (
    <div className="space-y-[10px]">
      <SupplierMultiSelect
        suppliers={p.supplierOptions}
        selectedIds={form.form.supplierIds}
        onChange={form.setSupplierIds}
        error={p.createErrors.supplierId}
        required
        onCreateSupplier={(name) => p.suppliers.openCreate({ name, onCreated: (s) => form.setSupplierIds([...form.form.supplierIds, s.id]) })}
        onAddSupplier={() => p.suppliers.openCreate({ onCreated: (s) => form.setSupplierIds([...form.form.supplierIds, s.id]) })}
      />
      <TextField
        label="Item no."
        required
        value={form.form.itemNo}
        onChange={form.set('itemNo')}
        placeholder="09419"
        error={p.createErrors.itemNo ?? (form.itemNoAvailability.taken ? 'A product with this item number already exists' : undefined)}
        adornment={
          form.form.itemNo.trim() !== '' ? (
            form.itemNoAvailability.checking ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-inventory-border-strong border-t-inventory-primary" />
            ) : form.itemNoAvailability.taken || p.createErrors.itemNo ? (
              <Close className="h-3 w-3 text-inventory-danger" />
            ) : (
              <Check className="h-3 w-3 text-inventory-success" />
            )
          ) : undefined
        }
      />
      <TextField label="Product name" required value={form.form.name} onChange={form.setName} placeholder="FLEX KINDY WIDE BRIM HAT" error={p.createErrors.name} />
      <div>
        <label className="mb-[2px] block text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-muted">
          Handle <span className="text-inventory-danger">*</span>
        </label>
        <div className="flex items-center gap-[5px]">
          <input
            type="text"
            value={form.form.handle}
            onChange={form.setHandle}
            disabled={form.handleLocked}
            placeholder="flex-kindy-wide-brim-hat"
            className={`h-[24px] w-full min-w-0 rounded-[7px] border px-[6px] text-[11px] leading-none outline-none transition-colors duration-150 focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring disabled:cursor-not-allowed ${
              p.createErrors.handle
                ? 'border-inventory-danger/35 bg-inventory-danger/8 focus:border-inventory-danger focus:ring-inventory-danger/20'
                : 'border-inventory-border-strong bg-inventory-surface hover:border-inventory-primary/40 disabled:border-inventory-border disabled:bg-inventory-primary/10 disabled:text-inventory-text-subtle'
            }`}
          />
          <button
            type="button"
            onClick={form.toggleHandleLock}
            aria-label={form.handleLocked ? 'Edit handle' : 'Auto-generate handle'}
            title={form.handleLocked ? 'Edit handle' : 'Auto-generate handle'}
            className={`flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[7px] border transition-colors duration-150 cursor-pointer ${
              form.handleLocked ? 'border-inventory-secondary/30 bg-inventory-secondary/10 text-inventory-secondary hover:bg-inventory-secondary/15' : 'border-inventory-border-strong bg-inventory-surface text-inventory-text-subtle hover:bg-inventory-surface-hover hover:text-inventory-text-muted'
            }`}
          >
            {form.handleLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          </button>
        </div>
        {p.createErrors.handle && <p className="mt-1 text-[10px] leading-tight text-inventory-danger">{p.createErrors.handle}</p>}
      </div>
      <TextField label="Brand" value={form.form.brand} onChange={form.set('brand')} placeholder="FLEX KINDY" />
    </div>
  );
}

function TextField({
  label,
  required,
  value,
  onChange,
  placeholder,
  error,
  adornment,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
  error?: string;
  adornment?: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-[2px] block text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-muted">
        {label} {required && <span className="text-inventory-danger">*</span>}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`h-[24px] w-full rounded-[7px] border px-[6px] text-[11px] uppercase leading-none outline-none transition-colors duration-150 placeholder:normal-case focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring ${
            adornment ? 'pr-[22px]' : ''
          } ${error ? 'border-inventory-danger/35 bg-inventory-danger/8 focus:border-inventory-danger focus:ring-inventory-danger/20' : 'border-inventory-border-strong bg-inventory-surface hover:border-inventory-primary/40'}`}
        />
        {adornment && <span className="pointer-events-none absolute inset-y-0 right-[6px] flex items-center">{adornment}</span>}
      </div>
      {error && <p className="mt-1 text-[10px] leading-tight text-inventory-danger">{error}</p>}
    </div>
  );
}
