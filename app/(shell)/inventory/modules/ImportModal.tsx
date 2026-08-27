'use client';

import { ModalActions, ModalShell } from '@/components/ModalShell';
import type { useImportExport } from './hooks/useImportExport';

export default function ImportModal({ importExport: ie }: { importExport: ReturnType<typeof useImportExport> }) {
  if (!ie.importOpen) return null;

  const hasProductFields = Object.keys(ie.previewProduct).length > 0 || ie.previewImages.length > 0;

  return (
    <ModalShell
      title="Import variants"
      onClose={ie.closeImport}
      wide
      footer={
        ie.previewRows.length > 0 ? (
          <ModalActions onCancel={ie.closeImport} onConfirm={ie.commitImport} confirmLabel={ie.importing ? 'Importing...' : `Import ${ie.previewRows.length} rows`} disabled={ie.importing} />
        ) : undefined
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Shopify product CSV (the same file produced by <span className="font-mono text-xs">Export to Excel</span>): Option1 Value (Colour), Option2 Value (Size), Variant SKU,
          Variant Barcode, Variant Inventory Qty, Cost per item, Variant Price. Matching colour/size updates the existing variant; anything new is created. Title, Body (HTML),
          Vendor, Type, Published and Image Src update the product&apos;s details and images. Trigger and pricing (buying price, freight, margin, tax) aren&apos;t touched by
          import.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void ie.handleFile(file);
          }}
          className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
        />

        {hasProductFields && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={ie.updateProductDetails}
                onChange={(e) => ie.setUpdateProductDetails(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 cursor-pointer"
              />
              Also update product details and images
            </label>
            {ie.updateProductDetails && (
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                {ie.previewProduct.name && (
                  <div>
                    <dt className="inline font-semibold text-gray-600">Title: </dt>
                    <dd className="inline">{ie.previewProduct.name}</dd>
                  </div>
                )}
                {ie.previewProduct.brand && (
                  <div>
                    <dt className="inline font-semibold text-gray-600">Vendor: </dt>
                    <dd className="inline">{ie.previewProduct.brand}</dd>
                  </div>
                )}
                {ie.previewProduct.category && (
                  <div>
                    <dt className="inline font-semibold text-gray-600">Type: </dt>
                    <dd className="inline">{ie.previewProduct.category}</dd>
                  </div>
                )}
                {ie.previewProduct.status && (
                  <div>
                    <dt className="inline font-semibold text-gray-600">Status: </dt>
                    <dd className="inline">{ie.previewProduct.status}</dd>
                  </div>
                )}
                {ie.previewImages.length > 0 && (
                  <div>
                    <dt className="inline font-semibold text-gray-600">Images: </dt>
                    <dd className="inline">{ie.previewImages.length} to add</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        )}

        {ie.previewRows.length > 0 && (
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
                {ie.previewRows.map((row, i) => (
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
    </ModalShell>
  );
}
