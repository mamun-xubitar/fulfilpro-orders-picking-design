'use client';

import { ModalShell } from '@/components/ModalShell';
import AnimatedStepBody from './newProduct/AnimatedStepBody';
import FilePicker from './FilePicker';
import type { ProductImportPreviewGroup, useImportProducts } from './hooks/useImportProducts';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_PRIMARY, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';
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
      wide
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        ip.preview ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={ip.closeModal}
              className={`flex-1 ${WIZARD_BTN_SECONDARY}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={ip.commitImport}
              disabled={ip.importing || actionableCount === 0}
              className={`flex-1 ${WIZARD_BTN_PRIMARY}`}
            >
              {ip.importing ? (
                <>
                  {SPINNER}
                  Importing…
                </>
              ) : (
                `Import ${actionableCount} product${actionableCount === 1 ? '' : 's'}`
              )}
            </button>
          </div>
        ) : undefined
      }
    >
      <div className={WIZARD_CARD_CLASS}>
        <AnimatedStepBody minHeightClassName="min-h-0">
          <div className="space-y-2">
            <p className="text-[12px] text-inventory-text-muted">
              Upload a Shopify product CSV — one product is created per Handle in the file, all under the supplier below.
            </p>

            <div>
              <label className="mb-[2px] block text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle">Supplier</label>
              <select
                value={ip.supplierId}
                onChange={(e) => ip.setSupplierId(e.target.value)}
                className="h-[24px] w-full max-w-xs rounded-[7px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer"
              >
                <option value="">Select a supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 rounded-[7px] border border-inventory-border bg-inventory-surface-muted p-2">
              <label className="flex items-start gap-2 text-[11px] leading-snug text-inventory-text-muted">
                <input
                  type="checkbox"
                  checked={ip.overwrite}
                  onChange={(e) => ip.setOverwrite(e.target.checked)}
                  className="mt-0.5 h-3 w-3 cursor-pointer accent-inventory-primary"
                />
                <span>
                  <span className="font-medium">Overwrite products with matching handles.</span> Existing values will be replaced for all columns
                  included in the CSV. Unchecked, a matching handle is skipped instead.
                </span>
              </label>
              <label className="flex items-start gap-2 text-[11px] leading-snug text-inventory-text-muted">
                <input
                  type="checkbox"
                  checked={ip.markVerified}
                  onChange={(e) => ip.setMarkVerified(e.target.checked)}
                  className="mt-0.5 h-3 w-3 cursor-pointer accent-inventory-primary"
                />
                <span className="font-medium">Mark every product as verified.</span>
              </label>
            </div>

            <FilePicker onSelect={(file) => void ip.handleFile(file)} disabled={!ip.supplierId} fileName={ip.pendingFile?.name} />

            {ip.previewing && <p className="text-[11px] text-inventory-text-subtle">Reading file…</p>}

            {allSkipped && (
              <p className="text-[11px] text-inventory-danger">
                Every product in this file already exists — tick &quot;Overwrite products with matching handles&quot; to replace their values.
              </p>
            )}

            {ip.preview && <ImportProductsPreviewTable groups={ip.preview} overwrite={ip.overwrite} />}
          </div>
        </AnimatedStepBody>
      </div>
    </ModalShell>
  );
}

function ImportProductsPreviewTable({ groups, overwrite }: { groups: ProductImportPreviewGroup[]; overwrite: boolean }) {
  return (
    <div className="max-h-96 overflow-x-auto overflow-y-auto thin-scroll rounded-lg border border-inventory-border">
      <table className="w-full min-w-[420px] border-collapse text-[11px] leading-none">
        <thead className="sticky top-0 bg-inventory-surface-muted">
          <tr className="border-b border-inventory-border text-left text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">
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
              <tr key={g.handle} className={`border-b border-inventory-divider last:border-0 transition-colors duration-150 hover:bg-inventory-surface-hover ${action === 'skip' ? 'opacity-50' : ''}`}>
                <td className="px-2 py-1 font-mono text-[11px] text-inventory-text-muted">{g.handle}</td>
                <td className="px-2 py-1 text-inventory-text-muted">{g.title}</td>
                <td className="px-2 py-1 text-right tabular-nums text-inventory-text-subtle">{g.variantCount}</td>
                <td className="px-2 py-1 text-right tabular-nums text-inventory-text-subtle">{g.imageCount}</td>
                <td className="px-2 py-1">
                  {action === 'skip' ? (
                    <span className="inline-flex items-center rounded-full border border-inventory-border-strong bg-inventory-surface-muted px-2 py-0.5 text-[10px] font-semibold text-inventory-text-muted">
                      Already exists
                    </span>
                  ) : action === 'update' ? (
                    <span className="inline-flex items-center rounded-full border border-inventory-warning/30 bg-inventory-warning/10 px-2 py-0.5 text-[10px] font-semibold text-inventory-warning-ink">
                      Update
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-inventory-success/30 bg-inventory-success/10 px-2 py-0.5 text-[10px] font-semibold text-inventory-success-hover">
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
