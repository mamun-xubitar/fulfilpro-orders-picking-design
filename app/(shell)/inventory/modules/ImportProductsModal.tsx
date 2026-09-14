'use client';

import { MODAL_FOOTER_BTN_PRIMARY, MODAL_FOOTER_BTN_SECONDARY, ModalShell } from '@/components/ModalShell';
import FilePicker from './FilePicker';
import type { ProductImportPreviewGroup, useImportProducts } from './hooks/useImportProducts';
import type { SupplierOption } from './types';

type ImportProductsModalProps = {
  importProducts: ReturnType<typeof useImportProducts>;
  suppliers: SupplierOption[];
};

/** create/update/skip is derived here from `exists` + the live "Overwrite" checkbox, rather than
 * baked into the preview response, so toggling the checkbox never needs a re-upload. */
function groupAction(group: ProductImportPreviewGroup, overwrite: boolean): 'create' | 'update' | 'skip' {
  if (!group.exists) return 'create';
  return overwrite ? 'update' : 'skip';
}

/** Bulk product import — creates one product per Handle group in a Shopify product CSV, all
 * under the chosen supplier. Mirrors ImportModal's preview-then-commit flow. */
export default function ImportProductsModal({ importProducts: ip, suppliers }: ImportProductsModalProps) {
  if (!ip.modalOpen) return null;

  const actionableCount = ip.preview?.filter((g) => groupAction(g, ip.overwrite) !== 'skip').length ?? 0;
  const allSkipped = !!ip.preview && ip.preview.length > 0 && actionableCount === 0;

  return (
    <ModalShell disableBackdropClose
      title="Import products"
      compact
      onClose={ip.closeModal}
      extraWide
      footer={
        ip.preview ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={ip.closeModal}
              className={`flex-1 ${MODAL_FOOTER_BTN_SECONDARY}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={ip.commitImport}
              disabled={ip.importing || actionableCount === 0}
              className={`flex-1 ${MODAL_FOOTER_BTN_PRIMARY}`}
            >
              {ip.importing ? 'Importing...' : `Import ${actionableCount} product${actionableCount === 1 ? '' : 's'}`}
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-2">
        <p className="text-[12px] text-gray-600">
          Upload a Shopify product CSV — one product is created per Handle in the file, all under the supplier below.
        </p>

        <div>
          <label className="mb-[2px] block text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-gray-500">Supplier</label>
          <select
            value={ip.supplierId}
            onChange={(e) => ip.setSupplierId(e.target.value)}
            className="h-[24px] w-full max-w-xs rounded-[7px] border border-gray-300 px-[6px] text-[11px] leading-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
          >
            <option value="">Select a supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 rounded-[7px] border border-gray-200 bg-gray-50 p-2">
          <label className="flex items-start gap-2 text-[11px] leading-snug text-gray-700">
            <input
              type="checkbox"
              checked={ip.overwrite}
              onChange={(e) => ip.setOverwrite(e.target.checked)}
              className="mt-0.5 h-3 w-3 cursor-pointer accent-blue-600"
            />
            <span>
              <span className="font-medium">Overwrite products with matching handles.</span> Existing values will be replaced for all columns
              included in the CSV. Unchecked, a matching handle is skipped instead.
            </span>
          </label>
          <label className="flex items-start gap-2 text-[11px] leading-snug text-gray-700">
            <input
              type="checkbox"
              checked={ip.markVerified}
              onChange={(e) => ip.setMarkVerified(e.target.checked)}
              className="mt-0.5 h-3 w-3 cursor-pointer accent-blue-600"
            />
            <span className="font-medium">Mark every product as verified.</span>
          </label>
        </div>

        <FilePicker onSelect={(file) => void ip.handleFile(file)} disabled={!ip.supplierId} fileName={ip.pendingFile?.name} />

        {ip.previewing && <p className="text-[11px] text-gray-400">Reading file…</p>}

        {allSkipped && (
          <p className="text-[11px] text-red-600">
            Every product in this file already exists — tick &quot;Overwrite products with matching handles&quot; to replace their values.
          </p>
        )}

        {ip.preview && <ImportProductsPreviewTable groups={ip.preview} overwrite={ip.overwrite} />}
      </div>
    </ModalShell>
  );
}

function ImportProductsPreviewTable({ groups, overwrite }: { groups: ProductImportPreviewGroup[]; overwrite: boolean }) {
  return (
    <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200">
      <table className="w-full border-collapse text-[11px] leading-none">
        <thead className="sticky top-0 bg-gray-50">
          <tr className="border-b border-gray-200 text-left text-[10px] font-bold uppercase tracking-[0.4px] text-gray-500">
            <th className="px-2 py-1">Handle</th>
            <th className="px-2 py-1">Title</th>
            <th className="px-2 py-1 text-right">Variants</th>
            <th className="px-2 py-1 text-right">Images</th>
            <th className="px-2 py-1">Action</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            const action = groupAction(g, overwrite);
            return (
              <tr key={g.handle} className={`border-b border-gray-100 last:border-0 ${action === 'skip' ? 'opacity-50' : ''}`}>
                <td className="px-2 py-1 font-mono text-[11px] text-gray-700">{g.handle}</td>
                <td className="px-2 py-1 text-gray-700">{g.title}</td>
                <td className="px-2 py-1 text-right tabular-nums text-gray-500">{g.variantCount}</td>
                <td className="px-2 py-1 text-right tabular-nums text-gray-500">{g.imageCount}</td>
                <td className="px-2 py-1">
                  {action === 'skip' ? (
                    <span className="inline-flex items-center rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                      Already exists
                    </span>
                  ) : action === 'update' ? (
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      Update
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Create
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
