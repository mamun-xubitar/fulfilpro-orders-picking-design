'use client';

import { formatColourName } from '@/lib/inventory/colour';
import type { ImportPreview } from './hooks/useImportExport';

type ProductPreview = Extract<ImportPreview, { type: 'product' }>;

export default function ProductImportPreviewTable({ preview }: { preview: ProductPreview }) {
  const hasProductFields = Object.keys(preview.product).length > 0 || preview.images.length > 0;

  return (
    <div className="space-y-2">
      {hasProductFields && (
        <div className="rounded-[7px] border border-inventory-border bg-inventory-surface-muted p-2">
          <p className="mb-1 text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle">Product details</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-inventory-text-subtle">
            {preview.product.name && (
              <div>
                <dt className="inline font-semibold text-inventory-text-muted">Title: </dt>
                <dd className="inline">{preview.product.name}</dd>
              </div>
            )}
            {preview.product.brand && (
              <div>
                <dt className="inline font-semibold text-inventory-text-muted">Vendor: </dt>
                <dd className="inline">{preview.product.brand}</dd>
              </div>
            )}
            {preview.product.category && (
              <div>
                <dt className="inline font-semibold text-inventory-text-muted">Category: </dt>
                <dd className="inline">{preview.product.category}</dd>
              </div>
            )}
            {preview.product.status && (
              <div>
                <dt className="inline font-semibold text-inventory-text-muted">Status: </dt>
                <dd className="inline">{preview.product.status}</dd>
              </div>
            )}
            {preview.images.length > 0 && (
              <div>
                <dt className="inline font-semibold text-inventory-text-muted">Images: </dt>
                <dd className="inline">{preview.images.length} to add</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {preview.rows.length > 0 && (
        <div className="max-h-72 overflow-y-auto thin-scroll rounded-lg border border-inventory-border">
          <table className="w-full border-collapse text-[11px] leading-none">
            <thead>
              <tr className="border-b border-inventory-border bg-inventory-surface-muted text-left text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">
                <th className="px-2 py-1">Colour</th>
                <th className="px-2 py-1">Size</th>
                <th className="px-2 py-1">SKU</th>
                <th className="px-2 py-1 text-right">Stock</th>
                <th className="px-2 py-1 text-right">Buy</th>
                <th className="px-2 py-1 text-right">Sell</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row, i) => (
                <tr key={i} className="border-b border-inventory-divider last:border-0 transition-colors duration-150 hover:bg-inventory-surface-hover">
                  <td className="px-2 py-1">{row.colour ? formatColourName(row.colour) : row.colour}</td>
                  <td className="px-2 py-1">{row.size}</td>
                  <td className="px-2 py-1 text-inventory-text-subtle">{row.sku || '—'}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{row.stockOnHand}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-inventory-text-subtle">{row.buyPrice !== undefined ? row.buyPrice.toFixed(2) : 'unchanged'}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{row.sellPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
