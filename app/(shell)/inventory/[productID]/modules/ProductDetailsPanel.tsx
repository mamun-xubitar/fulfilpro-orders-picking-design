'use client';

import { STATUS_BADGE } from './constants';
import { computeMargin, formatCurrency, groupVariantsByColor, getSizeBreakdown, htmlToPlainText } from './utils';
import ExpandCollapseButton from './ExpandCollapseButton';
import FieldChips from './FieldChips';
import SupplierSelect from './SupplierSelect';
import ProductGallery from './ProductGallery';
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
    <div className="w-full rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
            />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">Product details</h3>
        </div>
        <ExpandCollapseButton expanded={expanded} onToggle={onToggleExpand} label="details panel" />
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[15rem_1fr] gap-4">
          <ProductGallery product={product} />
          <div className="min-w-0">
            <StackedField label="Title" onEdit={() => onEditField('title')}>
              <span className="text-[13px] font-semibold text-gray-600">{product.title}</span>
            </StackedField>

            <StackedField label="Description" onEdit={() => onEditField('description')}>
              <p className="text-[13px] font-semibold text-gray-600 line-clamp-3">
                {product.descriptionHtml ? htmlToPlainText(product.descriptionHtml) || '—' : '—'}
              </p>
            </StackedField>
          </div>
        </div>

        <div className="mt-4 border-t border-gray-200 pt-4 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5 divide-gray-200">
          <div className="space-y-5 border-r border-gray-200 pr-4 lg:pr-8">
            <FieldGroup title="Identity">
              <Row label="Status" onEdit={() => onEditField('status')}>
                {STATUS_BADGE[product.status].label}
              </Row>
              <Row label="SKU">{skus.length === 0 ? '—' : skus.length === 1 ? skus[0] : 'Mixed'}</Row>
            </FieldGroup>

            <FieldGroup title="Classification">
              <Row label="Category" onEdit={() => onEditField('category')}>
                {product.category ?? '—'}
              </Row>
              <Row label="Product type" onEdit={() => onEditField('productType')}>
                {product.productType || '—'}
              </Row>
              <Row label="Vendor" onEdit={() => onEditField('vendor')}>
                {product.vendor || '—'}
              </Row>
              <Row label="Supplier">
                <SupplierSelect
                  options={supplierOptions}
                  suppliers={product.suppliers}
                  onSelect={onSelectSupplier}
                  saving={savingSupplier}
                />
              </Row>
            </FieldGroup>

            <FieldGroup title="Others" className="lg:col-span-2">
              <StackedField label="Tags" onEdit={() => onEditField('tags')}>
                <FieldChips values={product.tags} />
              </StackedField>
              <StackedField label="Collections">
                <FieldChips values={product.collections.map((c) => c.title)} />
              </StackedField>
            </FieldGroup>
          </div>

          <div className="space-y-5">
            <FieldGroup title="Pricing">
              <Row label="Price" onEdit={() => onEditField('price')}>
                {summarizeRange(prices)}
              </Row>
              <Row label="Cost" onEdit={() => onEditField('cost')}>
                {summarizeRange(costs)}
              </Row>
              {avgMargin != null && <Row label="Margin">{avgMargin.toFixed(1)}%</Row>}
            </FieldGroup>

            <FieldGroup title="Inventory">
              <Row label="Stock">
                <span className="inline-flex items-center gap-2">
                  <span>{product.totalInventory} in stock</span>
                  <button
                    type="button"
                    onClick={onResyncStock}
                    disabled={resyncing}
                    className="p-1 -my-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
                    title="Resync stock"
                  >
                    <svg className={`w-3.5 h-3.5 ${resyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                </span>
              </Row>
              <Row label="Continue selling when out of stock">
                <button
                  type="button"
                  onClick={onToggleContinueSelling}
                  disabled={togglingContinue}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
                    allContinueSelling ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      allContinueSelling ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </Row>
            </FieldGroup>
            <FieldGroup title="Options" className="lg:col-span-2">
              {hasColors && (
                <StackedField label="Colors">
                  <FieldChips values={colorLabels} />
                </StackedField>
              )}
              {sizeLabels.length > 0 && (
                <StackedField label="Sizes">
                  <FieldChips values={sizeLabels} />
                </StackedField>
              )}
            </FieldGroup>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldGroup({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{title}</h4>
      <div className={`divide-y divide-gray-100 ${className || ''}`}>{children}</div>
    </div>
  );
}

function Row({ label, onEdit, children }: { label: string; onEdit?: () => void; children: React.ReactNode }) {
  return (
    <div className="py-2.5 flex items-center justify-between gap-2">
      <span className="flex items-center gap-1 min-w-0 text-[13px] font-medium text-gray-600">
        <EditIcon label={label} onEdit={onEdit} />
        <span className="truncate">{label}</span>
      </span>
      <span className="text-[13px] font-semibold text-gray-900 text-right">{children}</span>
    </div>
  );
}

function StackedField({ label, onEdit, children }: { label: string; onEdit?: () => void; children: React.ReactNode }) {
  return (
    <div className="py-2.5">
      <span className="flex items-center gap-1 min-w-0 text-[13px] font-medium text-gray-600 mb-1.5">
        <EditIcon label={label} onEdit={onEdit} />
        <span className="truncate">{label}</span>
      </span>
      <div>{children}</div>
    </div>
  );
}

function EditIcon({ label, onEdit }: { label: string; onEdit?: () => void }) {
  if (!onEdit) return <span className="w-4 shrink-0" />;
  return (
    <button
      type="button"
      onClick={onEdit}
      className="shrink-0 p-0.5 -ml-0.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100 cursor-pointer"
      aria-label={`Edit ${label}`}
    >
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
        />
      </svg>
    </button>
  );
}
