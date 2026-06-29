'use client';

import type { SavedFile, TaskRow } from './types';

type Props = {
  task: TaskRow | null;
  proofFiles: SavedFile[];
  loading: boolean;
  onUpload: (files: FileList) => Promise<void>;
  onSubmit: () => void;
  onClose: () => void;
  onRemoveFile: (index: number) => void;
};

export default function CompleteTaskModal({ task, proofFiles, loading, onUpload, onSubmit, onClose, onRemoveFile }: Props) {
  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Mark Task Complete</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">Completing: <span className="font-medium text-gray-900">{task.title}</span></p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proof files <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-150 text-sm text-gray-600">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
              </svg>
              <span>Attach files</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files) void onUpload(e.target.files); }}
              />
            </label>
            {proofFiles.length > 0 && (
              <ul className="mt-2 space-y-1">
                {proofFiles.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                    </svg>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600">
                      {f.name}
                    </a>
                    <button
                      onClick={() => onRemoveFile(i)}
                      className="ml-auto text-gray-400 hover:text-red-600 cursor-pointer"
                      title="Remove"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer disabled:opacity-60"
          >
            {loading && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            Mark Complete
          </button>
        </div>
      </div>
    </div>
  );
}
