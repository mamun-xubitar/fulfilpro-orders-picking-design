'use client';

import { STATUS_BADGE } from './constants';
import { computeMargin, formatCurrency, groupVariantsByColor, getSizeBreakdown, htmlToPlainText } from './utils';
import FieldChips from './FieldChips';
import SupplierSelect from './SupplierSelect';
import type { EditableField } from './hooks/useFieldEdit';
import type { ProductDetail, SupplierOption } from './types';

type ProductDetailsPanelProps = {
  product: ProductDetail;
  allContinueSelling: boolean;
  onToggleContinueSelling: () => void;
  togglingContinue: boolean;
  onResyncStock: () => void;
  resyncing: boolean;
  onEditField: (field: EditableField) => void;
  supplierOptions: SupplierOption[];
  savingSupplier: boolean;
  onSelectSupplier: (supplierId: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
};

function summarizeRange(values: number[]) {
  if (values.length === 0) return '—';
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? formatCurrency(min) : 'Mixed';
}

export default function ProductDetailsPanel({
  product,
  allContinueSelling,
  onToggleContinueSelling,
  togglingContinue,
  onResyncStock,
  resyncing,
  onEditField,
  supplierOptions,
  savingSupplier,
  onSelectSupplier,
  expanded,
  onToggleExpand,
}: ProductDetailsPanelProps) {
  const prices = product.variants.map((v) => v.price);
  const costs = product.variants.filter((v) => v.cost != null).map((v) => v.cost as number);
  const skus = [...new Set(product.variants.map((v) => v.sku).filter(Boolean))];
  const colorLabels = groupVariantsByColor(product.variants).map((g) => g.label);
  const sizeLabels = getSizeBreakdown(product.variants, null).map((s) => s.size);
  const hasColors = colorLabels.length > 0 && !(colorLabels.length === 1 && colorLabels[0] === 'Default');
  const avgMargin =
    product.variants.length > 0 && costs.length === product.variants.length
      ? product.variants.reduce((sum, v) => sum + (computeMargin(v.price, v.cost) ?? 0), 0) / product.variants.length
      : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={onToggleExpand}
          className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 cursor-pointer"
          title={expanded ? 'Collapse' : 'Expand'}
          aria-label={expanded ? 'Collapse details panel' : 'Expand details panel'}
        >
          {expanded ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5M15 9l5.25-5.25M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 20.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
              />
            </svg>
          )}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Title" full onEdit={() => onEditField('title')}>
          <span className="text-sm text-gray-900">{product.title}</span>
        </Field>

        <Field label="Description" full onEdit={() => onEditField('description')}>
          <p className="text-sm text-gray-700 line-clamp-3 flex-1 min-w-0">
            {product.descriptionHtml ? htmlToPlainText(product.descriptionHtml) || '—' : '—'}
          </p>
        </Field>

        <Field label="SKU">
          <div className="text-sm text-gray-700 py-2">{skus.length === 0 ? '—' : skus.length === 1 ? skus[0] : 'Mixed'}</div>
        </Field>

        <Field label="Status" onEdit={() => onEditField('status')}>
          <span className="text-sm text-gray-900">{STATUS_BADGE[product.status].label}</span>
        </Field>

        <Field label="Category" onEdit={() => onEditField('category')}>
          <span className="text-sm text-gray-900">{product.category ?? '—'}</span>
        </Field>

        <Field label="Product type" onEdit={() => onEditField('productType')}>
          <span className="text-sm text-gray-900">{product.productType || '—'}</span>
        </Field>

        <Field label="Tags" full onEdit={() => onEditField('tags')}>
          {product.tags.length === 0 ? (
            <span className="text-sm text-gray-500">—</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {product.tags.map((tag) => (
                <span key={tag} className="bg-gray-100 text-gray-700 text-xs rounded-full px-2 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </Field>

        <Field label="Collections" full>
          <FieldChips values={product.collections.map((c) => c.title)} />
        </Field>

        {hasColors && (
          <Field label="Colors">
            <FieldChips values={colorLabels} />
          </Field>
        )}

        {sizeLabels.length > 0 && (
          <Field label="Sizes">
            <FieldChips values={sizeLabels} />
          </Field>
        )}

        <Field label="Vendor" onEdit={() => onEditField('vendor')}>
          <span className="text-sm text-gray-900">{product.vendor || '—'}</span>
        </Field>

        <Field label="Supplier">
          <SupplierSelect
            options={supplierOptions}
            suppliers={product.suppliers}
            onSelect={onSelectSupplier}
            saving={savingSupplier}
          />
        </Field>

        <Field label="Price" onEdit={() => onEditField('price')}>
          <span className="text-sm text-gray-900">{summarizeRange(prices)}</span>
        </Field>

        <Field label="Cost" onEdit={() => onEditField('cost')}>
          <span className="text-sm text-gray-900">{summarizeRange(costs)}</span>
        </Field>

        {avgMargin != null && (
          <Field label="Margin">
            <div className="text-sm text-gray-700 py-2">{avgMargin.toFixed(1)}%</div>
          </Field>
        )}

        <Field label="Stock">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">{product.totalInventory} in stock</span>
            <button
              type="button"
              onClick={onResyncStock}
              disabled={resyncing}
              className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
              title="Resync stock"
            >
              <svg className={`w-4 h-4 ${resyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </Field>

        <Field label="Continue selling when out of stock">
          <button
            type="button"
            onClick={onToggleContinueSelling}
            disabled={togglingContinue}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
              allContinueSelling ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${allContinueSelling ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </Field>
      </div>
    </div>
  );
}

function Field({ label, full, onEdit, children }: { label: string; full?: boolean; onEdit?: () => void; children: React.ReactNode }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {onEdit ? (
        <div className="flex items-center gap-2">
          {children}
          <button
            type="button"
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
            aria-label={`Edit ${label}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
              />
            </svg>
          </button>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
