'use client';

import type { RecurringTaskRow } from './types';

type Props = {
  task: RecurringTaskRow;
  currentUserId: string;
  isAdmin: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onManageAssignees: () => void;
  onStopRecurring: () => void;
  onResumeRecurring: () => void;
  onDeleteRecurring: () => void;
};

export default function RecurringTaskRowActions({
  task, currentUserId, isAdmin, expanded, onToggleExpand, onManageAssignees, onStopRecurring, onResumeRecurring, onDeleteRecurring,
}: Props) {
  const canManage = isAdmin && task.assignerId === currentUserId;

  return (
    <div className="flex items-center justify-end gap-1.5">
      {canManage && (
        <button
          onClick={onManageAssignees}
          title="Manage assignees"
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-3.13a4 4 0 100-8 4 4 0 000 8zm6 3a4 4 0 10-8 0" />
          </svg>
        </button>
      )}

      {canManage && (task.stoppedAt ? (
        <button
          onClick={onResumeRecurring}
          title="Resume recurring"
          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-150 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      ) : (
        <button
          onClick={onStopRecurring}
          title="Stop recurring"
          className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors duration-150 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 11-12.728 0M12 3v9"/>
          </svg>
        </button>
      ))}

      {canManage && (
        <button
          onClick={() => {
            if (confirm('Delete this recurring task? Tasks it has already created will be kept.')) onDeleteRecurring();
          }}
          title="Delete recurring task"
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      )}

      <button
        onClick={onToggleExpand}
        title={expanded ? 'Collapse' : 'Expand'}
        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-150 cursor-pointer"
      >
        <svg className={`w-5 h-5 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
    </div>
  );
}
