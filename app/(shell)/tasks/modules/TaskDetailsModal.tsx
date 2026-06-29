'use client';

import type { TaskRow } from './types';
import { STATE_STYLES } from './constants';
import { formatDueDate } from './utils';

type Props = {
  task: TaskRow | null;
  onClose: () => void;
};

export default function TaskDetailsModal({ task, onClose }: Props) {
  if (!task) return null;

  const style = STATE_STYLES[task.state];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Task Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Title</p>
            <p className="text-sm font-semibold text-gray-900">{task.title}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Assignee</p>
              <p className="text-sm text-gray-800">{task.assigneeName}</p>
              <p className="text-xs text-gray-500">{task.assigneeEmail}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Status</p>
              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
                {style.label}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Due Date</p>
              <p className="text-sm text-gray-700">{formatDueDate(task.dueDate)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Completed At</p>
              <p className="text-sm text-gray-700">{task.completedAt ? formatDueDate(task.completedAt) : '—'}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
