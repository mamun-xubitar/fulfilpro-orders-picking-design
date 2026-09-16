'use client';

import { useState } from 'react';
import type { RecurringTaskRow, UserOption } from './types';

type Props = {
  task: RecurringTaskRow | null;
  users: UserOption[];
  loading: boolean;
  errors: Record<string, string>;
  onAdd: (assigneeId: string, description: string) => void;
  onRemove: (assigneeId: string) => void;
  onClose: () => void;
};

export default function ManageAssigneesModal({ task, users, loading, errors, onAdd, onRemove, onClose }: Props) {
  const [assigneeId, setAssigneeId] = useState('');
  const [description, setDescription] = useState('');

  if (!task) return null;

  const availableUsers = users.filter((u) => !task.assignees.some((a) => a.assigneeId === u.id));

  function handleAdd() {
    if (!assigneeId) return;
    onAdd(assigneeId, description.trim());
    setAssigneeId('');
    setDescription('');
  }

  function handleClose() {
    setAssigneeId('');
    setDescription('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Manage Assignees</h2>
            <p className="text-xs text-gray-500 mt-0.5">{task.title}</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Current Assignees</p>
            <div className="space-y-2">
              {task.assignees.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3 border border-gray-200 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">{a.assigneeName || a.assigneeEmail}</p>
                    <p className="text-xs text-gray-500 truncate">{a.assigneeEmail}</p>
                    {a.description && <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">{a.description}</p>}
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${a.assigneeName || a.assigneeEmail} from this recurring task?`)) onRemove(a.assigneeId);
                    }}
                    disabled={loading || task.assignees.length <= 1}
                    title={task.assignees.length <= 1 ? 'Stop the recurring task instead of removing the last assignee' : 'Remove'}
                    className="shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Add Assignee</p>
            {task.stoppedAt && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-2">
                This recurring task is stopped. Adding an assignee creates one task for them now, but won&apos;t resume future occurrences.
              </p>
            )}
            <div className="space-y-2">
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Select a user...</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email} ({u.role})</option>
                ))}
              </select>
              {errors.assigneeId && <p className="text-xs text-red-600">{errors.assigneeId}</p>}

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Description (defaults to the task description)"
              />

              <button
                onClick={handleAdd}
                disabled={loading || !assigneeId}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-60"
              >
                {loading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                )}
                Add
              </button>
            </div>
          </div>

          {errors.general && <p className="text-sm text-red-600">{errors.general}</p>}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-gray-100">
          <button onClick={handleClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
