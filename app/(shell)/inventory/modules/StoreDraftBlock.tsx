'use client';

import type { ProductRecord } from './types';
import type { StoreDraft } from './hooks/useStorePublish';

type StoreDraftBlockProps = {
  storeName: string;
  storeDomain: string;
  product: ProductRecord;
  draft: StoreDraft;
  onChange: (next: StoreDraft) => void;
  /** Which field groups to show — the bulk-update modal only renders the checked aspects. */
  showDetails: boolean;
  showPricing: boolean;
  showVariants: boolean;
};

/**
 * One store's editable slice of a publish/bulk-update — bordered so several of these stacked in
 * the bulk-update modal read as clearly separate store targets. Product master fields (name,
 * description, image, variant structure) are shown read-only from the hub record; only what can
 * legitimately differ per store (tags, SEO, price) is editable here.
 */
export default function StoreDraftBlock({ storeName, storeDomain, product, draft, onChange, showDetails, showPricing, showVariants }: StoreDraftBlockProps) {
  const setField = (field: 'tags' | 'seoTitle' | 'seoDescription') => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...draft, [field]: e.target.value });

  const setPrice = (variantId: string, value: string) => onChange({ ...draft, variantPrices: { ...draft.variantPrices, [variantId]: value } });

  return (
    <div className="rounded-xl border-2 border-gray-200 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h4 className="text-sm font-semibold text-gray-900">{storeName}</h4>
        <span className="text-[11px] text-gray-400">{storeDomain}</span>
      </div>

      {showDetails && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Tags (comma separated)" value={draft.tags} onChange={setField('tags')} placeholder="new, summer, hat" />
          <TextField label="SEO title" value={draft.seoTitle} onChange={setField('seoTitle')} placeholder={product.name} />
          <div className="sm:col-span-2">
            <TextField label="SEO description" value={draft.seoDescription} onChange={setField('seoDescription')} placeholder="Optional" />
          </div>
        </div>
      )}

      {(showPricing || showVariants) && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Variant</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">SKU</th>
                {showVariants && <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">Available</th>}
                {showPricing && <th className="w-28 px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">Price</th>}
              </tr>
            </thead>
            <tbody>
              {product.variants.map((v) => (
                <tr key={v.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-2 py-1.5 text-[13px] font-medium text-gray-900">
                    {v.colour} / {v.size}
                  </td>
                  <td className="px-2 py-1.5 text-[13px] text-gray-500">{v.sku ?? '—'}</td>
                  {showVariants && (
                    <td className="px-2 py-1.5 text-right text-[13px] tabular-nums text-gray-700">{Math.max(0, v.stockOnHand - v.allocated)}</td>
                  )}
                  {showPricing && (
                    <td className="px-2 py-1.5 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={draft.variantPrices[v.id] ?? String(v.sellPrice)}
                        onChange={(e) => setPrice(v.id, e.target.value)}
                        aria-label={`Price for ${v.colour} / ${v.size} at ${storeName}`}
                        className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-right text-[13px] tabular-nums outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!showDetails && !showPricing && !showVariants && (
        <p className="text-[13px] text-gray-400">Images will be republished from the product&apos;s current gallery ({product.images.length} file(s)).</p>
      )}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: React.ChangeEventHandler<HTMLInputElement>; placeholder: string }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  );
}
