'use client';

import { getRoleLabel } from '@/lib/roles';
import type { AssignModalState, DecoratorUser } from './types';

type AssignModalProps = {
  assignModal: AssignModalState;
  setAssignModal: React.Dispatch<React.SetStateAction<AssignModalState | null>>;
  closeAssignModal: () => void;
  removeAssignment: (assignmentId: string) => void;
  submitAssignment: () => void;
  decoratorUsers: DecoratorUser[];
  decoratorUsersLoaded: boolean;
};

export default function AssignModal({
  assignModal,
  setAssignModal,
  closeAssignModal,
  removeAssignment,
  submitAssignment,
  decoratorUsers,
  decoratorUsersLoaded,
}: AssignModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeAssignModal}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Assign decorators</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Order {assignModal.orderNumber} · {assignModal.productName}
            </p>
          </div>
          <button onClick={closeAssignModal} className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer">×</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Current assignees</p>
            {assignModal.assignments.length === 0 ? (
              <p className="text-xs text-gray-400">No decorators assigned yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {assignModal.assignments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{a.assigneeName}</p>
                      <p className="text-[11px] text-gray-500">
                        {getRoleLabel(a.assigneeRole)}{a.dueDate ? ` · due ${a.dueDate}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => removeAssignment(a.id)}
                      disabled={assignModal.removingId === a.id}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      {assignModal.removingId === a.id ? 'Removing…' : 'Remove'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2 border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-500 uppercase">Add assignee</p>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Decorator</label>
              <select
                value={assignModal.selectedUserId}
                onChange={(e) => setAssignModal((prev) => (prev ? { ...prev, selectedUserId: e.target.value } : prev))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a decorator…</option>
                {decoratorUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} — {getRoleLabel(u.role)}</option>
                ))}
              </select>
              {decoratorUsersLoaded && decoratorUsers.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-1">No active decorator users. Create them in Users.</p>
              )}
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Complete by (optional)</label>
              <input
                type="date"
                value={assignModal.dueDate}
                onChange={(e) => setAssignModal((prev) => (prev ? { ...prev, dueDate: e.target.value } : prev))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {assignModal.error && <p className="text-xs text-red-500">{assignModal.error}</p>}
            <button
              onClick={submitAssignment}
              disabled={assignModal.saving || !assignModal.selectedUserId}
              className="w-full rounded-lg bg-blue-600 text-white py-2 text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {assignModal.saving ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
