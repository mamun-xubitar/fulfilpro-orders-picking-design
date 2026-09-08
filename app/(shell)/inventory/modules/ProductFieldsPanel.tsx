'use client';

import CategoryPicker from './CategoryPicker';
import { PanelHeading } from './MainImagePanel';
import { ActionButton } from './PricingMarginPanel';
import ProductColoursField from './ProductColoursField';
import { Field, FieldLabel, HtmlField, TextAreaField, TextField } from './ProductFieldRows';
import ProductStatusSelect from './ProductStatusSelect';
import ProductSizesField from './ProductSizesField';
import RichTextField from './RichTextField';
import SupplierMultiSelect from './SupplierMultiSelect';
import { productStatusLabel, PRODUCT_STATUS_BADGES } from './constants';
import { Check, Close, Document, Lock, Pencil, Unlock } from './icons';
import type { useProductDetails } from './hooks/useProductDetails';
import type { SupplierOption } from './types';

type ProductFieldsPanelProps = {
  details: ReturnType<typeof useProductDetails>;
  supplierOptions: SupplierOption[];
};

export default function ProductFieldsPanel({ details: d, supplierOptions }: ProductFieldsPanelProps) {
  const editing = d.editing;

  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <PanelHeading icon={<Document className="h-4 w-4" />} title="Product details" />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          {editing ? (
            <>
              <TextField label="Item no." value={d.form.itemNo} onChange={d.set('itemNo')} />
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
            </>
          ) : (
            <>
              <Field label="Item no." value={d.form.itemNo} />
              <Field label="Handle" value={d.form.handle} />
            </>
          )}
        </div>
        {d.errors?.handle && <p className="-mt-2 text-xs text-red-600">{d.errors.handle}</p>}

        {editing ? (
          <TextField label="Product name" value={d.form.name} onChange={d.setName} />
        ) : (
          <Field label="Product name" value={d.form.name} />
        )}

        {editing ? <TextField label="Brand" value={d.form.brand} onChange={d.set('brand')} /> : <Field label="Brand" value={d.form.brand} />}

        {editing ? (
          <SupplierMultiSelect
            suppliers={supplierOptions}
            selectedIds={d.form.supplierIds}
            onChange={d.setSupplierIds}
            error={d.errors?.supplierId}
          />
        ) : (
          <div>
            <FieldLabel>Suppliers</FieldLabel>
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2">
              {d.form.supplierIds.length === 0 ? (
                <span className="text-[13px] text-gray-400">—</span>
              ) : (
                d.form.supplierIds.map((id) => {
                  const s = supplierOptions.find((o) => o.id === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700"
                    >
                      {s?.name ?? id}
                    </span>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {editing ? (
            <>
              <CategoryPicker value={{ id: d.form.categoryId, name: d.form.category }} onChange={d.setCategory} />
              <TextField label="SKU" value={d.form.sku} onChange={d.set('sku')} />
            </>
          ) : (
            <>
              <Field label="Category" value={d.form.category} />
              <Field label="SKU" value={d.form.sku} />
            </>
          )}
        </div>

        {editing ? (
          <>
            <RichTextField label="Description" value={d.form.description} onChange={d.setDescription} />
            <TextAreaField label="Remarks" value={d.form.remarks} onChange={d.set('remarks')} />
          </>
        ) : (
          <>
            <HtmlField label="Description" value={d.form.description} />
            <Field label="Remarks" value={d.form.remarks} multiline />
          </>
        )}

        <ProductSizesField value={d.form.sizes} sizes={d.sizes} editing={editing} onChange={d.set('sizes')} error={d.errors?.sizes} />

        <ProductColoursField value={d.form.colours} colours={d.colours} editing={editing} onChange={d.set('colours')} error={d.errors?.colours} />

        <StatusRow details={d} editing={editing} />

        <div className="mt-auto flex gap-2 pt-1">
          {editing ? (
            <>
              <ActionButton onClick={d.cancelEdit} icon={<Close />} label="Cancel" />
              <ActionButton onClick={d.saveDetails} icon={<Check />} label="Save" primary />
            </>
          ) : (
            <ActionButton onClick={d.startEdit} icon={<Pencil />} label="Edit" />
          )}
        </div>
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

function StatusRow({ details: d, editing }: { details: ReturnType<typeof useProductDetails>; editing: boolean }) {
  if (editing) {
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

  return (
    <div className="flex items-center gap-2 pt-0.5">
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
          PRODUCT_STATUS_BADGES[d.form.status] ?? PRODUCT_STATUS_BADGES.UNLISTED
        }`}
      >
        {productStatusLabel(d.form.status)}
      </span>
      <VerifiedBadge verified={d.form.verified} />
    </div>
  );
}
