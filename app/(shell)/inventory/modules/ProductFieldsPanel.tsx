'use client';

import { useState } from 'react';
import CategoryPicker from './CategoryPicker';
import { PanelHeading } from './MainImagePanel';
import { ActionButton } from './PricingMarginPanel';
import { ColourChips } from './ProductColoursField';
import { FieldLabel, TextField } from './ProductFieldRows';
import { EditColoursModal, EditSizesModal } from './ProductOptionModals';
import ProductStatusSelect from './ProductStatusSelect';
import { SizeChips } from './ProductSizesField';
import DescriptionField from './DescriptionField';
import SupplierMultiSelect from './SupplierMultiSelect';
import { Check, Document, Lock, Plus, Unlock } from './icons';
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

const FIELD_VISUAL_CLASS =
  'h-[24px] rounded-[7px] border border-gray-300 px-[6px] text-[11px] leading-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

/** Always editable — every field is a live input; Save is the only action, disabled until the
 * draft differs from what's saved (see useProductDetails' `dirty`). Two-column field grid
 * (design 6), with Category forced full width regardless of the prototype's own pairing. */
export default function ProductFieldsPanel({ details: d, supplierOptions, presets, suppliers, embedded }: ProductFieldsPanelProps) {
  const itemNoAvailability = useItemNoAvailability(d.form.itemNo, d.productId ?? undefined);
  const [sizesOpen, setSizesOpen] = useState(false);
  const [coloursOpen, setColoursOpen] = useState(false);

  return (
    <section className={embedded ? 'flex min-w-0 flex-col' : 'flex min-w-0 flex-col rounded-[10px] border border-gray-200 bg-white shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] xl:min-h-0'}>
      {!embedded && (
        <PanelHeading
          icon={<Document className="h-3 w-3" />}
          title="Product details"
          action={<ActionButton onClick={() => d.saveDetails()} icon={<Check className="h-3 w-3" />} label="Save" primary disabled={!d.dirty} compact />}
        />
      )}

      <div className={embedded ? 'flex flex-1 flex-col gap-[4px]' : 'flex flex-1 flex-col gap-[4px] p-[6px] xl:min-h-0 xl:overflow-y-auto'}>
        <div className="grid grid-cols-2 gap-x-[7px] gap-y-[3px]">
          <TextField
            label="Item no."
            value={d.form.itemNo}
            onChange={d.set('itemNo')}
            error={d.errors?.itemNo ?? (itemNoAvailability.taken ? 'A product with this item number already exists' : undefined)}
          />
          <div className="min-w-0">
            <FieldLabel>Handle</FieldLabel>
            <div className="flex items-center gap-[5px]">
              <input
                type="text"
                value={d.form.handle}
                onChange={d.set('handle')}
                disabled={d.handleLocked}
                aria-label="Handle"
                className="h-[24px] w-full min-w-0 rounded-[7px] border border-gray-300 px-[6px] text-[11px] leading-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
              />
              <button
                type="button"
                onClick={d.toggleHandleLock}
                aria-label={d.handleLocked ? 'Edit handle' : 'Auto-generate handle'}
                title={d.handleLocked ? 'Edit handle' : 'Auto-generate handle'}
                className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[7px] border border-gray-300 bg-white text-gray-500 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-700 cursor-pointer"
              >
                {d.handleLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              </button>
            </div>
          </div>
          {d.errors?.handle && <p className="col-span-2 -mt-1 text-[10px] leading-tight text-red-600">{d.errors.handle}</p>}

          <TextField label="Product name" value={d.form.name} onChange={d.setName} />
          <TextField label="SKU" value={d.form.sku} onChange={d.set('sku')} />

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

          <div className="col-span-2">
            <CategoryPicker value={{ id: d.form.categoryId, name: d.form.category }} onChange={d.setCategory} />
          </div>

          <div className="min-w-0">
            <FieldLabel>Sizes</FieldLabel>
            <div className="flex flex-wrap items-center gap-[4px]">
              <div className="flex min-w-0 flex-1 flex-wrap gap-[4px]">
                {d.sizes.length === 0 ? (
                  <span className="text-[11px] leading-none text-gray-400">—</span>
                ) : (
                  <SizeChips sizes={d.sizes} />
                )}
              </div>
              <button
                type="button"
                onClick={() => setSizesOpen(true)}
                aria-label="Edit sizes"
                title="Edit sizes"
                className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border border-gray-300 bg-white text-gray-500 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-700 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            {d.errors?.sizes && <p className="mt-[2px] text-[10px] leading-tight text-red-600">{d.errors.sizes}</p>}
          </div>

          <div className="min-w-0">
            <FieldLabel>Colours</FieldLabel>
            <div className="flex flex-wrap items-center gap-[4px]">
              <div className="flex min-w-0 flex-1 flex-wrap gap-[4px]">
                {d.colours.length === 0 ? (
                  <span className="text-[11px] leading-none text-gray-400">—</span>
                ) : (
                  <ColourChips colours={d.colours} />
                )}
              </div>
              <button
                type="button"
                onClick={() => setColoursOpen(true)}
                aria-label="Edit colours"
                title="Edit colours"
                className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border border-gray-300 bg-white text-gray-500 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-700 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            {d.errors?.colours && <p className="mt-[2px] text-[10px] leading-tight text-red-600">{d.errors.colours}</p>}
          </div>

          <div className="col-span-2 grid grid-cols-3 gap-x-[7px]">
            <div className="min-w-0">
              <FieldLabel>PO Quantity</FieldLabel>
              <input
                type="number"
                min={1}
                value={d.form.poQuantity}
                onChange={d.set('poQuantity')}
                aria-label="PO Quantity"
                title="Default quantity seeded onto every variant when creating a purchase order"
                className={FIELD_VISUAL_CLASS + ' w-full'}
              />
              {d.errors?.poQuantity && <p className="mt-[2px] text-[10px] leading-tight text-red-600">{d.errors.poQuantity}</p>}
            </div>
            <div className="min-w-0">
              <FieldLabel>Status</FieldLabel>
              <ProductStatusSelect value={d.form.status} onChange={d.setStatus} className={FIELD_VISUAL_CLASS} />
            </div>
            <div className="min-w-0">
              <FieldLabel>Verified</FieldLabel>
              <label className="inline-flex h-[24px] max-w-full cursor-pointer items-center gap-[5px] text-[11px] font-medium leading-none text-gray-700" aria-label="Verified">
                <input
                  type="checkbox"
                  checked={d.form.verified}
                  onChange={(e) => d.setVerified(e.target.checked)}
                  className="h-3 w-3 cursor-pointer accent-blue-600"
                />
                <span className="cursor-pointer select-none">Verified</span>
              </label>
            </div>
          </div>

          <div className="col-span-2">
            <DescriptionField details={d} showDetailsButton={!embedded} />
          </div>

          <div className="col-span-2">
            <TextField label="Product Remark" value={d.form.productRemark} onChange={d.set('productRemark')} placeholder="Add remarks…" />
          </div>
        </div>
      </div>

      {sizesOpen && (
        <EditSizesModal initialValue={d.form.sizes} presets={presets} onClose={() => setSizesOpen(false)} onSave={d.setSizesValue} />
      )}
      {coloursOpen && (
        <EditColoursModal
          initialValue={d.form.colours}
          presets={presets}
          onClose={() => setColoursOpen(false)}
          onSave={d.setColoursValue}
        />
      )}
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
