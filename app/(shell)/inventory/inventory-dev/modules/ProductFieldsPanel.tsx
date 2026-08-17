'use client';

import { PanelHeading } from './MainImagePanel';
import { ActionButton } from './PricingMarginPanel';
import ProductColoursField from './ProductColoursField';
import { Field, FieldLabel, SelectField, TextAreaField, TextField } from './ProductFieldRows';
import ProductSizesField from './ProductSizesField';
import { PRODUCT_CATEGORIES, PRODUCT_STATUS_BADGES } from './constants';
import { Check, Close, Document, Pencil } from './icons';
import { makeSwatchResolver } from './utils';
import type { useProductDetailsDemo } from './hooks/useProductDetailsDemo';
import type { ProductStatusValue } from './types';

type ProductFieldsPanelProps = {
  details: ReturnType<typeof useProductDetailsDemo>;
};

const STATUS_OPTIONS: ProductStatusValue[] = ['ACTIVE', 'DRAFT', 'ARCHIVED'];

/** Demo mode: Save only leaves edit mode — nothing is written back to the product list. */
export default function ProductFieldsPanel({ details: d }: ProductFieldsPanelProps) {
  const editing = d.editing;
  const swatchOf = makeSwatchResolver(d.colours);

  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <PanelHeading icon={<Document className="h-4 w-4" />} title="Product details" />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          {editing ? (
            <>
              <TextField label="Item no." value={d.form.itemNo} onChange={d.set('itemNo')} />
              <TextField label="Brand" value={d.form.brand} onChange={d.set('brand')} />
            </>
          ) : (
            <>
              <Field label="Item no." value={d.form.itemNo} />
              <Field label="Brand" value={d.form.brand} />
            </>
          )}
        </div>

        {editing ? (
          <TextField label="Product name" value={d.form.name} onChange={d.set('name')} />
        ) : (
          <Field label="Product name" value={d.form.name} />
        )}

        <div className="grid grid-cols-2 gap-3">
          {editing ? (
            <>
              <SelectField label="Category" value={d.form.category} options={PRODUCT_CATEGORIES} onChange={d.set('category')} />
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
            <TextAreaField label="Description" value={d.form.description} onChange={d.set('description')} />
            <TextAreaField label="Delivery remarks" value={d.form.deliveryRemarks} onChange={d.set('deliveryRemarks')} />
          </>
        ) : (
          <>
            <Field label="Description" value={d.form.description} multiline />
            <Field label="Delivery remarks" value={d.form.deliveryRemarks} multiline />
          </>
        )}

        <ProductSizesField value={d.form.sizes} sizes={d.sizes} editing={editing} onChange={d.set('sizes')} />

        <ProductColoursField
          colours={d.colours}
          editing={editing}
          swatchOf={swatchOf}
          onChange={d.setColour}
          onAdd={d.addColour}
          onRemove={d.removeColour}
        />

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

function StatusRow({ details: d, editing }: { details: ReturnType<typeof useProductDetailsDemo>; editing: boolean }) {
  if (editing) {
    return (
      <div className="flex items-end gap-3">
        <div className="min-w-0">
          <FieldLabel>Status</FieldLabel>
          <select
            value={d.form.status}
            onChange={(e) => d.setStatus(e.target.value as ProductStatusValue)}
            aria-label="Status"
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 py-2 text-[13px] font-medium text-gray-700">
          <input
            type="checkbox"
            checked={d.form.verified}
            onChange={(e) => d.setVerified(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer accent-blue-600"
          />
          Verified
        </label>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 pt-0.5">
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
          PRODUCT_STATUS_BADGES[d.form.status] ?? PRODUCT_STATUS_BADGES.ARCHIVED
        }`}
      >
        {d.form.status}
      </span>
      {d.form.verified && (
        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
          Verified
        </span>
      )}
    </div>
  );
}
