'use client';

import type { WorkModalState } from './types';
import DialogShell from './dialogs/DialogShell';
import { dlgBtn, dlgInput } from './dialogs/dialogUi';

type WorkModalProps = {
  workModal: WorkModalState;
  closeWorkModal: () => void;
  updateWorkQuantity: (value: string) => void;
  addCommentRow: () => void;
  removeCommentRow: (index: number) => void;
  updateCommentField: (index: number, field: 'sizes' | 'colors' | 'remarks' | 'location', value: string) => void;
  uploadCommentFiles: (index: number, fileList: FileList | null) => void;
  removeCommentFile: (index: number, fileIndex: number) => void;
  submitWork: () => void;
};

/** Mark decoration done (Admin): quantity done plus comment rows (sizes, colours, remarks, location). */
export default function WorkModal({ workModal, closeWorkModal, updateWorkQuantity, addCommentRow, removeCommentRow, updateCommentField, removeCommentFile, submitWork }: WorkModalProps) {
  const max = workModal.item.decoration?.remaining ?? workModal.item.qty;
  return (
    <DialogShell
      title="Mark decoration done"
      sub={`#${workModal.order.number} · ${workModal.item.name || workModal.item.title}`}
      width={380}
      busy={workModal.saving}
      onClose={closeWorkModal}
      footer={<>
        <button type="button" onClick={closeWorkModal} disabled={workModal.saving} className={dlgBtn.ghost}>Cancel</button>
        <button type="button" onClick={submitWork} disabled={workModal.saving || workModal.comments.some((c) => c.uploading)} className={dlgBtn.pri}>{workModal.saving ? 'Saving…' : 'Save work'}</button>
      </>}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-orders-text-subtle">Quantity done <span className="text-orders-text-subtle">(max {max})</span></span>
          <input type="number" min={1} max={max} value={workModal.quantityDone} onChange={(e) => updateWorkQuantity(e.target.value)} aria-label="Quantity done" className={`${dlgInput} w-20 text-center`} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9.5px] font-bold uppercase tracking-[.4px] text-orders-text-subtle">Comments &amp; files</span>
          <button type="button" onClick={addCommentRow} className="text-[10.5px] font-bold text-orders-primary-ink hover:underline cursor-pointer">+ Add row</button>
        </div>
        {workModal.comments.map((comment, ci) => (
          <div key={ci} className="flex flex-col gap-1.5 rounded-[7px] border border-orders-border bg-orders-surface-muted p-2">
            <div className="grid grid-cols-2 gap-1.5">
              {(['sizes', 'colors', 'remarks', 'location'] as const).map((field) => (
                <input key={field} value={comment[field]} onChange={(e) => updateCommentField(ci, field, e.target.value)} placeholder={field.charAt(0).toUpperCase() + field.slice(1)} className={dlgInput} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {comment.uploading && <span className="text-[10px] text-orders-text-subtle">Uploading…</span>}
              {comment.files.map((file, fi) => (
                <span key={fi} className="inline-flex items-center gap-1 rounded-full border border-orders-border bg-orders-surface px-2 text-[10.5px] text-orders-text-muted">
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{file.name}</a>
                  <button type="button" aria-label={`Remove ${file.name}`} onClick={() => removeCommentFile(ci, fi)} className="text-orders-text-subtle hover:text-orders-danger cursor-pointer">×</button>
                </span>
              ))}
              {workModal.comments.length > 1 && <button type="button" onClick={() => removeCommentRow(ci)} className="ml-auto text-[10.5px] font-bold text-orders-danger hover:underline cursor-pointer">Remove row</button>}
            </div>
          </div>
        ))}
        {workModal.error && <p className="text-[11px] text-orders-danger">{workModal.error}</p>}
      </div>
    </DialogShell>
  );
}
