'use client';

import CategoryPicker from './CategoryPicker';
import { PanelHeading } from './MainImagePanel';
import { ActionButton } from './PricingMarginPanel';
import ProductColoursField from './ProductColoursField';
import { FieldLabel, TextAreaField, TextField } from './ProductFieldRows';
import ProductStatusSelect from './ProductStatusSelect';
import ProductSizesField from './ProductSizesField';
import DescriptionField from './DescriptionField';
import SupplierMultiSelect from './SupplierMultiSelect';
import { Check, Document, Lock, Unlock } from './icons';
import type { useProductDetails } from './hooks/useProductDetails';
import type { useSuppliers } from './hooks/useSuppliers';
import type { InventoryPresetsState } from './hooks/useInventoryPresets';
import { useItemNoAvailability } from './hooks/useItemNoAvailability';
import type { SupplierOption } from './types';

type ProductFieldsPanelProps = {
  details: ReturnType<typeof useProductDetails>;
  supplierOptions: SupplierOption[];
  presets: InventoryPresetsState;
  suppliers: ReturnType<typeof useSuppliers>;
  /** For the New Product wizard's Details step — hides the panel chrome (heading, Save row)
   * since the wizard's own footer drives saving and advancing. */
  embedded?: boolean;
};

/** Always editable — every field is a live input; Save is the only action, disabled until the
 * draft differs from what's saved (see useProductDetails' `dirty`). */
export default function ProductFieldsPanel({ details: d, supplierOptions, presets, suppliers, embedded }: ProductFieldsPanelProps) {
  const itemNoAvailability = useItemNoAvailability(d.form.itemNo, d.productId ?? undefined);

  return (
    <section className={embedded ? 'flex min-w-0 flex-col' : 'flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm'}>
      {!embedded && <PanelHeading icon={<Document className="h-4 w-4" />} title="Product details" />}

      <div className={embedded ? 'flex flex-1 flex-col gap-3' : 'flex flex-1 flex-col gap-3 p-4'}>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Item no."
            value={d.form.itemNo}
            onChange={d.set('itemNo')}
            error={d.errors?.itemNo ?? (itemNoAvailability.taken ? 'A product with this item number already exists' : undefined)}
          />
          <div className="min-w-0">
            <FieldLabel>Handle</FieldLabel>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={d.form.handle}
                onChange={d.set('handle')}
                disabled={d.handleLocked}
                aria-label="Handle"
                className="w-full min-w-0 rounded-lg border border-gray-300 px-2 py-1.5 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
              />
              <button
                type="button"
                onClick={d.toggleHandleLock}
                aria-label={d.handleLocked ? 'Edit handle' : 'Auto-generate handle'}
                title={d.handleLocked ? 'Edit handle' : 'Auto-generate handle'}
                className="shrink-0 rounded-lg border border-gray-300 bg-white p-1.5 text-gray-500 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-700 cursor-pointer"
              >
                {d.handleLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
        {d.errors?.handle && <p className="-mt-2 text-xs text-red-600">{d.errors.handle}</p>}

        <TextField label="Product name" value={d.form.name} onChange={d.setName} />

        <TextField label="Brand" value={d.form.brand} onChange={d.set('brand')} />

        <SupplierMultiSelect
          suppliers={supplierOptions}
          selectedIds={d.form.supplierIds}
          onChange={d.setSupplierIds}
          error={d.errors?.supplierId}
          onCreateSupplier={(name) =>
            suppliers.openCreate({ name, onCreated: (s) => d.setSupplierIds([...d.form.supplierIds, s.id]) })
          }
          onAddSupplier={() =>
            suppliers.openCreate({ onCreated: (s) => d.setSupplierIds([...d.form.supplierIds, s.id]) })
          }
        />

        <div className="grid grid-cols-2 gap-3">
          <CategoryPicker value={{ id: d.form.categoryId, name: d.form.category }} onChange={d.setCategory} />
          <TextField label="SKU" value={d.form.sku} onChange={d.set('sku')} />
        </div>

        <DescriptionField details={d} />
        <TextAreaField label="Remarks" value={d.form.remarks} onChange={d.set('remarks')} />

        <ProductSizesField
          value={d.form.sizes}
          sizes={d.sizes}
          editing
          onChange={d.set('sizes')}
          onValueChange={d.setSizesValue}
          error={d.errors?.sizes}
          presets={presets}
        />

        <ProductColoursField
          value={d.form.colours}
          colours={d.colours}
          editing
          onChange={d.set('colours')}
          onValueChange={d.setColoursValue}
          error={d.errors?.colours}
          presets={presets}
        />

        <StatusRow details={d} />

        {!embedded && (
          <div className="mt-auto flex gap-2 pt-1">
            <ActionButton onClick={() => d.saveDetails()} icon={<Check />} label="Save" primary disabled={!d.dirty} />
          </div>
        )}
      </div>
    </section>
  );
}

/** Always shown, whichever way it goes — red for unverified so an unreviewed record reads as
 * a warning rather than fading into "no badge at all". */
export function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
      Verified
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
      Unverified
    </span>
  );
}

function StatusRow({ details: d }: { details: ReturnType<typeof useProductDetails> }) {
  return (
    <div className="grid grid-cols-2 items-start gap-3">
      <div className="min-w-0">
        <FieldLabel>Status</FieldLabel>
        <ProductStatusSelect value={d.form.status} onChange={d.setStatus} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer" />
      </div>
      <div className="min-w-0">
        <FieldLabel>Verified</FieldLabel>
        <label className="flex h-[34px] cursor-pointer items-center gap-1.5 text-[13px] font-medium text-gray-700">
          <input
            type="checkbox"
            checked={d.form.verified}
            onChange={(e) => d.setVerified(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer accent-blue-600"
          />
          Verified
        </label>
      </div>
    </div>
  );
}
