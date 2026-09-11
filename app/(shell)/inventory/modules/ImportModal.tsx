'use client';

import { ModalShell } from '@/components/ModalShell';
import FilePicker from './FilePicker';
import PoImportPreviewTable from './PoImportPreviewTable';
import ProductImportPreviewTable from './ProductImportPreviewTable';
import type { useImportExport } from './hooks/useImportExport';

export default function ImportModal({ importExport: ie }: { importExport: ReturnType<typeof useImportExport> }) {
  if (!ie.importOpen) return null;

  const preview = ie.preview;
  // Overwrite is unticked and the file's handle matches this product — commit would be refused,
  // so block it client-side instead of letting the admin hit the 409.
  const blockedByOverwrite = preview?.type === 'product' && preview.handleMatches && !ie.overwrite;
  const confirmLabel =
    preview?.type === 'product'
      ? `Import ${preview.rows.length} row${preview.rows.length === 1 ? '' : 's'}`
      : preview?.type === 'po'
        ? `Import ${preview.groups.length} purchase order${preview.groups.length === 1 ? '' : 's'}`
        : '';

  return (
    <ModalShell
      title="Import"
      onClose={ie.closeImport}
      extraWide
      footer={
        preview ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={ie.closeImport}
              className="h-[22px] flex-1 rounded-[6px] border border-gray-300 bg-white px-[6px] text-[10px] font-bold leading-none text-gray-600 transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={ie.commitImport}
              disabled={ie.importing || blockedByOverwrite}
              className="h-[22px] flex-1 rounded-[6px] bg-blue-600 px-[6px] text-[10px] font-bold leading-none text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {ie.importing ? 'Importing...' : confirmLabel}
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-2">
        <p className="text-[12px] text-gray-600">
          Drop a Shopify product CSV or a purchase-order CSV — the file type is detected automatically. A product CSV updates this product&apos;s details, main image and
          variants/stock matrix. A PO CSV inserts or updates purchase orders for this product (matched by PO number) and their line items; the Incoming column updates
          automatically. Pricing (buying price, freight, margin, tax) and the reorder Trigger aren&apos;t touched by import.
        </p>
        <div className="space-y-1.5 rounded-[7px] border border-gray-200 bg-gray-50 p-2">
          <label className="flex items-start gap-2 text-[11px] leading-snug text-gray-700">
            <input
              type="checkbox"
              checked={ie.overwrite}
              onChange={(e) => ie.setOverwrite(e.target.checked)}
              className="mt-0.5 h-3 w-3 cursor-pointer accent-blue-600"
            />
            <span>
              <span className="font-medium">Overwrite this product if the file&apos;s handle matches.</span> Checked: this product&apos;s values are
              replaced by the file. Unchecked: the import is skipped instead. <span className="text-gray-400">(Product CSV only.)</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-[11px] leading-snug text-gray-700">
            <input
              type="checkbox"
              checked={ie.markVerified}
              onChange={(e) => ie.setMarkVerified(e.target.checked)}
              className="mt-0.5 h-3 w-3 cursor-pointer accent-blue-600"
            />
            <span>
              <span className="font-medium">Mark this product as verified.</span> <span className="text-gray-400">(Product CSV only.)</span>
            </span>
          </label>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-gray-700">
            <span className="font-medium">Attribute new purchase orders to</span>
            <select
              value={ie.poSupplierId}
              onChange={(e) => ie.setPoSupplierId(e.target.value)}
              className="h-[22px] rounded-[7px] border border-gray-300 bg-white px-[6px] text-[11px] leading-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
            >
              {ie.poSupplierOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="text-gray-400">(PO CSV only.)</span>
          </div>
        </div>

        <FilePicker onSelect={(file) => void ie.handleFile(file)} fileName={ie.pendingFile?.name} />

        {ie.previewing && <p className="text-[11px] text-gray-400">Reading file…</p>}

        {blockedByOverwrite && (
          <p className="text-[11px] text-red-600">
            This product already exists — tick &quot;Overwrite this product if the file&apos;s handle matches&quot; to replace their values.
          </p>
        )}

        {preview?.type === 'product' && <ProductImportPreviewTable preview={preview} />}
        {preview?.type === 'po' && <PoImportPreviewTable preview={preview} />}
      </div>
    </ModalShell>
  );
}
