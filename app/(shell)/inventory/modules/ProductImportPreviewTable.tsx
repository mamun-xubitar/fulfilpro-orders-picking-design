'use client';

import type { ImportPreview } from './hooks/useImportExport';

type ProductPreview = Extract<ImportPreview, { type: 'product' }>;

export default function ProductImportPreviewTable({ preview }: { preview: ProductPreview }) {
  const hasProductFields = Object.keys(preview.product).length > 0 || preview.images.length > 0;

  return (
    <div className="space-y-3">
      {hasProductFields && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Product details</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
            {preview.product.name && (
              <div>
                <dt className="inline font-semibold text-gray-600">Title: </dt>
                <dd className="inline">{preview.product.name}</dd>
              </div>
            )}
            {preview.product.brand && (
              <div>
                <dt className="inline font-semibold text-gray-600">Vendor: </dt>
                <dd className="inline">{preview.product.brand}</dd>
              </div>
            )}
            {preview.product.category && (
              <div>
                <dt className="inline font-semibold text-gray-600">Type: </dt>
                <dd className="inline">{preview.product.category}</dd>
              </div>
            )}
            {preview.product.status && (
              <div>
                <dt className="inline font-semibold text-gray-600">Status: </dt>
                <dd className="inline">{preview.product.status}</dd>
              </div>
            )}
            {preview.images.length > 0 && (
              <div>
                <dt className="inline font-semibold text-gray-600">Images: </dt>
                <dd className="inline">{preview.images.length} to add</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {preview.rows.length > 0 && (
        <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2">Colour</th>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2 text-right">Stock</th>
                <th className="px-3 py-2 text-right">Buy</th>
                <th className="px-3 py-2 text-right">Sell</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="px-3 py-1.5">{row.colour}</td>
                  <td className="px-3 py-1.5">{row.size}</td>
                  <td className="px-3 py-1.5 text-gray-500">{row.sku || '—'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{row.stockOnHand}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-gray-400">{row.buyPrice !== undefined ? row.buyPrice.toFixed(2) : 'unchanged'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{row.sellPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
