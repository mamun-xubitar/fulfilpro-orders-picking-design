'use client';

import type { WorkModalState } from './types';

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

export default function WorkModal({
  workModal,
  closeWorkModal,
  updateWorkQuantity,
  addCommentRow,
  removeCommentRow,
  updateCommentField,
  uploadCommentFiles,
  removeCommentFile,
  submitWork,
}: WorkModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeWorkModal}>
      <div className="w-full max-w-lg rounded-xl bg-orders-surface shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-orders-border px-5 py-3">
          <div>
            <h3 className="text-sm font-semibold text-orders-text">Mark as done</h3>
            <p className="text-xs text-orders-text-subtle mt-0.5">Order {workModal.order.number} · {workModal.item.name || workModal.item.title}</p>
          </div>
          <button onClick={closeWorkModal} className="text-orders-text-subtle hover:text-orders-text-muted text-lg leading-none cursor-pointer">×</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[11px] text-orders-text-subtle mb-1">
              Quantity done (max {workModal.item.decoration?.remaining ?? workModal.item.qty})
            </label>
            <input
              type="number"
              min={1}
              max={workModal.item.decoration?.remaining ?? workModal.item.qty}
              value={workModal.quantityDone}
              onChange={(e) => updateWorkQuantity(e.target.value)}
              className="w-28 border border-orders-border-strong rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-orders-text-subtle uppercase">Comments &amp; files</p>
              <button onClick={addCommentRow} className="text-xs text-orders-primary hover:text-blue-800">+ Add row</button>
            </div>
            {workModal.comments.map((comment, ci) => (
              <div key={ci} className="rounded-lg border border-orders-border p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {(['sizes', 'colors', 'remarks', 'location'] as const).map((field) => (
                    <input
                      key={field}
                      value={comment[field]}
                      onChange={(e) => updateCommentField(ci, field, e.target.value)}
                      placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                      className="border border-orders-border-strong rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* <label className="inline-flex items-center gap-1 cursor-pointer text-xs text-orders-primary hover:text-blue-800">
                    <input type="file" multiple className="hidden" onChange={(e) => { void uploadCommentFiles(ci, e.target.files); e.target.value = ''; }} />
                    📎 Add files
                  </label> */}
                  {comment.uploading && <span className="text-[11px] text-orders-text-subtle">Uploading…</span>}
                  {comment.files.map((file, fi) => (
                    <span key={fi} className="inline-flex items-center gap-1 rounded-full bg-orders-canvas px-2 py-0.5 text-[11px] text-orders-text-muted">
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{file.name}</a>
                      <button onClick={() => removeCommentFile(ci, fi)} className="text-orders-text-subtle hover:text-red-500 cursor-pointer">×</button>
                    </span>
                  ))}
                  {workModal.comments.length > 1 && (
                    <button onClick={() => removeCommentRow(ci)} className="ml-auto text-[11px] text-red-500 hover:text-orders-danger-ink">Remove row</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {workModal.error && <p className="text-xs text-red-500">{workModal.error}</p>}
          <button
            onClick={submitWork}
            disabled={workModal.saving || workModal.comments.some((c) => c.uploading)}
            className="w-full rounded-lg bg-emerald-600 text-white py-2 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
          >
            {workModal.saving ? 'Saving…' : 'Confirm done'}
          </button>
        </div>
      </div>
    </div>
  );
}
