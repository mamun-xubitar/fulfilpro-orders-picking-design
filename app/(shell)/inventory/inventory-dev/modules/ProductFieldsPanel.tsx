'use client';

import { PanelHeading } from './MainImagePanel';
import { PRODUCT_STATUS_BADGES } from './constants';
import { Document } from './icons';
import { getSwatch, listColours, listSizes } from './utils';
import type { ProductRecord } from './types';

/** Fields are read-only in demo mode — wiring them up needs a PATCH endpoint. */
export default function ProductFieldsPanel({ product }: { product: ProductRecord }) {
  const colours = listColours(product.variants);
  const sizes = listSizes(product.variants);

  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <PanelHeading icon={<Document className="h-4 w-4" />} title="Product details" />

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Item no." value={product.itemNo} />
          <Field label="Brand" value={product.brand} />
        </div>

        <Field label="Product name" value={product.name} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Category" value={product.category} />
          <Field label="SKU" value={product.sku} />
        </div>

        <Field label="Description" value={product.description} multiline />
        <Field label="Delivery remarks" value={product.deliveryRemarks} multiline />

        <div>
          <FieldLabel>Sizes</FieldLabel>
          <div className="flex flex-wrap gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2">
            {sizes.length === 0 ? (
              <span className="text-[13px] text-gray-400">—</span>
            ) : (
              sizes.map((size) => (
                <span key={size} className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                  {size}
                </span>
              ))
            )}
          </div>
        </div>

        <div>
          <FieldLabel>Colours</FieldLabel>
          <div className="flex flex-wrap gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2">
            {colours.length === 0 ? (
              <span className="text-[13px] text-gray-400">—</span>
            ) : (
              colours.map((colour) => (
                <span key={colour} className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                  <span className="h-2 w-2 rounded-full ring-1 ring-black/10" style={{ backgroundColor: getSwatch(colour) }} />
                  {colour}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              PRODUCT_STATUS_BADGES[product.status] ?? PRODUCT_STATUS_BADGES.ARCHIVED
            }`}
          >
            {product.status}
          </span>
          {product.verified && (
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
              Verified
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">{children}</span>;
}

function Field({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <p
        className={`rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-[13px] text-gray-900 ${
          multiline ? 'min-h-16 whitespace-pre-line' : 'truncate font-medium'
        }`}
        title={multiline ? undefined : value}
      >
        {value || '—'}
      </p>
    </div>
  );
}
