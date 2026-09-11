'use client';

import SupplierMultiSelect from '../SupplierMultiSelect';
import { Lock, Unlock } from '../icons';
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
    <div className="space-y-2">
      <SupplierMultiSelect
        suppliers={p.supplierOptions}
        selectedIds={form.form.supplierIds}
        onChange={form.setSupplierIds}
        error={p.createErrors.supplierId}
        onCreateSupplier={(name) => p.suppliers.openCreate({ name, onCreated: (s) => form.setSupplierIds([...form.form.supplierIds, s.id]) })}
        onAddSupplier={() => p.suppliers.openCreate({ onCreated: (s) => form.setSupplierIds([...form.form.supplierIds, s.id]) })}
      />
      <TextField
        label="Item no."
        value={form.form.itemNo}
        onChange={form.set('itemNo')}
        placeholder="09419"
        error={p.createErrors.itemNo ?? (form.itemNoAvailability.taken ? 'A product with this item number already exists' : undefined)}
      />
      <TextField label="Product name" value={form.form.name} onChange={form.setName} placeholder="FLEX KINDY WIDE BRIM HAT" error={p.createErrors.name} />
      <div>
        <label className="mb-[2px] block text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-gray-500">Handle</label>
        <div className="flex items-center gap-[5px]">
          <input
            type="text"
            value={form.form.handle}
            onChange={form.setHandle}
            disabled={form.handleLocked}
            placeholder="flex-kindy-wide-brim-hat"
            className="h-[24px] w-full min-w-0 rounded-[7px] border border-gray-300 px-[6px] text-[11px] leading-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
          />
          <button
            type="button"
            onClick={form.toggleHandleLock}
            aria-label={form.handleLocked ? 'Edit handle' : 'Auto-generate handle'}
            title={form.handleLocked ? 'Edit handle' : 'Auto-generate handle'}
            className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[7px] border border-gray-300 bg-white text-gray-500 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-700 cursor-pointer"
          >
            {form.handleLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          </button>
        </div>
        {p.createErrors.handle && <p className="mt-1 text-[10px] leading-tight text-red-600">{p.createErrors.handle}</p>}
      </div>
      <TextField label="Brand" value={form.form.brand} onChange={form.set('brand')} placeholder="FLEX KINDY" />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-[2px] block text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-gray-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-[24px] w-full rounded-[7px] border border-gray-300 px-[6px] text-[11px] leading-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      {error && <p className="mt-1 text-[10px] leading-tight text-red-600">{error}</p>}
    </div>
  );
}
