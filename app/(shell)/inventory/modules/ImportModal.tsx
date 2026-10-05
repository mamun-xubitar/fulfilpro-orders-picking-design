'use client';

import { ModalShell } from '@/components/ModalShell';
import AnimatedStepBody from './newProduct/AnimatedStepBody';
import FilePicker from './FilePicker';
import ProductImportPreviewTable from './ProductImportPreviewTable';
import type { useImportExport } from './hooks/useImportExport';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_PRIMARY, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';

export default function ImportModal({ importExport: ie }: { importExport: ReturnType<typeof useImportExport> }) {
  if (!ie.importOpen) return null;

  const preview = ie.preview;
  // Overwrite is unticked and the file's handle matches this product — commit would be refused,
  // so block it client-side instead of letting the admin hit the 409.
  const blockedByOverwrite = preview?.handleMatches && !ie.overwrite;
  const confirmLabel = preview ? `Import ${preview.rows.length} row${preview.rows.length === 1 ? '' : 's'}` : '';

  return (
    <ModalShell disableBackdropClose
      title="Import"
      compact
      onClose={ie.closeImport}
      wide
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        preview ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={ie.closeImport}
              className={`flex-1 ${WIZARD_BTN_SECONDARY}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={ie.commitImport}
              disabled={ie.importing || blockedByOverwrite}
              className={`flex-1 ${WIZARD_BTN_PRIMARY}`}
            >
              {ie.importing ? (
                <>
                  {SPINNER}
                  Importing…
                </>
              ) : (
                confirmLabel
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
              Drop a Shopify product CSV — it updates this product&apos;s details, main image and variants/stock matrix. Pricing (buying price, freight, margin, tax) and the
              reorder Trigger aren&apos;t touched by import.
            </p>
            <div className="space-y-1.5 rounded-[7px] border border-inventory-border bg-inventory-surface-muted p-2">
              <label className="flex items-start gap-2 text-[11px] leading-snug text-inventory-text-muted">
                <input
                  type="checkbox"
                  checked={ie.overwrite}
                  onChange={(e) => ie.setOverwrite(e.target.checked)}
                  className="mt-0.5 h-3 w-3 cursor-pointer accent-inventory-primary"
                />
                <span>
                  <span className="font-medium">Overwrite this product if the file&apos;s handle matches.</span> Checked: this product&apos;s values are
                  replaced by the file. Unchecked: the import is skipped instead.
                </span>
              </label>
              <label className="flex items-start gap-2 text-[11px] leading-snug text-inventory-text-muted">
                <input
                  type="checkbox"
                  checked={ie.markVerified}
                  onChange={(e) => ie.setMarkVerified(e.target.checked)}
                  className="mt-0.5 h-3 w-3 cursor-pointer accent-inventory-primary"
                />
                <span>
                  <span className="font-medium">Mark this product as verified.</span>
                </span>
              </label>
            </div>

            <FilePicker onSelect={(file) => void ie.handleFile(file)} fileName={ie.pendingFile?.name} />

            {ie.previewing && <p className="text-[11px] text-inventory-text-subtle">Reading file…</p>}

            {blockedByOverwrite && (
              <p className="text-[11px] text-inventory-danger">
                This product already exists — tick &quot;Overwrite this product if the file&apos;s handle matches&quot; to replace their values.
              </p>
            )}

            {preview && <ProductImportPreviewTable preview={preview} />}
          </div>
        </AnimatedStepBody>
      </div>
    </ModalShell>
  );
}
