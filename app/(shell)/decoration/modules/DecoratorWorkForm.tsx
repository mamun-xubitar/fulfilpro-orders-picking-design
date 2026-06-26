'use client';

import type { OrderItem, WorkDraftState } from '../../orders/modules/types';

type DecoratorWorkFormProps = {
  draft: WorkDraftState;
  item: OrderItem;
  onQuantity: (value: string) => void;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onField: (index: number, field: 'sizes' | 'colors' | 'remarks' | 'location', value: string) => void;
  onUpload: (index: number, files: FileList | null) => void;
  onRemoveFile: (index: number, fileIndex: number) => void;
  onSubmit: () => void;
};

export default function DecoratorWorkForm({
  draft,
  item,
  onQuantity,
  onAddRow,
  onRemoveRow,
  onField,
  onUpload,
  onRemoveFile,
  onSubmit,
}: DecoratorWorkFormProps) {
  const maxQty = item.decoration?.remaining ?? item.qty;

  return (
    <div className="mt-3 border-t border-gray-200 pt-3 space-y-4">
      <div>
        <label className="block text-[11px] text-gray-500 mb-1">
          Quantity done (max {maxQty})
        </label>
        <input
          type="number"
          min={1}
          max={maxQty}
          value={draft.quantityDone}
          onChange={(e) => onQuantity(e.target.value)}
          className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 uppercase">Comments &amp; files</p>
          <button type="button" onClick={onAddRow} className="text-xs text-blue-600 hover:text-blue-800">+ Add row</button>
        </div>
        {draft.comments.map((comment, ci) => (
          <div key={ci} className="rounded-lg border border-gray-200 p-3 space-y-2">
            <div className="grid grid-cols-4 gap-2">
              {(['sizes', 'colors', 'remarks', 'location'] as const).map((field) => (
                <input
                  key={field}
                  value={comment[field]}
                  onChange={(e) => onField(ci, field, e.target.value)}
                  placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                  className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1 cursor-pointer text-xs text-blue-600 hover:text-blue-800">
                <input type="file" multiple className="hidden" onChange={(e) => { void onUpload(ci, e.target.files); e.target.value = ''; }} />
                📎 Add files
              </label>
              {comment.uploading && <span className="text-[11px] text-gray-400">Uploading…</span>}
              {comment.files.map((file, fi) => (
                <span key={fi} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{file.name}</a>
                  <button type="button" onClick={() => onRemoveFile(ci, fi)} className="text-gray-400 hover:text-red-500">×</button>
                </span>
              ))}
              {draft.comments.length > 1 && (
                <button type="button" onClick={() => onRemoveRow(ci)} className="ml-auto text-[11px] text-red-500 hover:text-red-700">Remove row</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {draft.error && <p className="text-xs text-red-500">{draft.error}</p>}
      <button
        type="button"
        onClick={onSubmit}
        disabled={draft.saving || draft.comments.some((c) => c.uploading)}
        className="px-4 rounded-lg bg-emerald-600 text-white py-2 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
      >
        {draft.saving ? 'Saving…' : 'Confirm done'}
      </button>
    </div>
  );
}
