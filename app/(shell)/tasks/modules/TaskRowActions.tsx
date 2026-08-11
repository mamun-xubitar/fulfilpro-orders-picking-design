'use client';

import type { TaskRow } from './types';

type RowKind = 'normal' | 'recurringParent' | 'recurringChild';

type Props = {
  task: TaskRow;
  currentUserId: string;
  isAdmin: boolean;
  onEdit: (task: TaskRow) => void;
  onDelete: (taskId: string) => void;
  onComplete: (task: TaskRow) => void;
  onMessages: (task: TaskRow) => void;
  onViewProofs: (task: TaskRow) => void;
  onView: (task: TaskRow) => void;
  rowKind?: RowKind;
  expanded?: boolean;
  onToggleExpand?: (task: TaskRow) => void;
  onStopRecurring?: () => void;
};

export default function TaskRowActions({
  task, currentUserId, isAdmin, onEdit, onDelete, onComplete, onMessages, onViewProofs, onView,
  rowKind = 'normal', expanded, onToggleExpand, onStopRecurring,
}: Props) {
  const isAssigner = task.assignerId === currentUserId;
  const isAssignee = task.assigneeId === currentUserId;
  const canComplete = task.status !== 'COMPLETED' && (isAssignee || (isAdmin && isAssigner));
  const canEditDelete = isAdmin && isAssigner;

  return (
    <div className="flex items-center justify-end gap-1.5">
      {rowKind !== 'recurringParent' && (
        <button
          onClick={() => onView(task)}
          title="View task"
          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-150 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
        </button>
      )}

      {rowKind !== 'recurringParent' && (
        <button
          onClick={() => onMessages(task)}
          title="Messages"
          className="relative p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
          </svg>
          {task.messageCount > 0 && (
            <span className={`absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 ${task.unreadCount > 0 ? 'bg-red-500' : 'bg-gray-400'} text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5`}>
              {task.messageCount > 9 ? '9+' : task.messageCount}
            </span>
          )}
        </button>
      )}

      {rowKind !== 'recurringParent' && task.status === 'COMPLETED' && task.proofFiles.length > 0 && (
        <button
          onClick={() => onViewProofs(task)}
          title="View proof files"
          className="relative p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-150 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
          </svg>
          {task.proofFiles.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 bg-gray-400 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
              {task.proofFiles.length > 9 ? '9+' : task.proofFiles.length}
            </span>
          )}
        </button>
      )}

      {rowKind !== 'recurringParent' && canComplete && (
        <button
          onClick={() => onComplete(task)}
          title="Mark complete"
          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-150 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
          </svg>
        </button>
      )}

      {rowKind !== 'recurringParent' && canEditDelete && (
        <>
          <button
            onClick={() => onEdit(task)}
            title="Edit"
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button
            onClick={() => {
              if (confirm('Delete this task?')) onDelete(task.id);
            }}
            title="Delete"
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </>
      )}

      {rowKind === 'recurringParent' && canEditDelete && !task.recurrenceStoppedAt && (
        <button
          onClick={() => onStopRecurring?.()}
          title="Stop recurring"
          className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors duration-150 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 11-12.728 0M12 3v9"/>
          </svg>
        </button>
      )}

      {rowKind === 'recurringParent' && (
        <button
          onClick={() => onToggleExpand?.(task)}
          title={expanded ? 'Collapse' : 'Expand'}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-150 cursor-pointer"
        >
          <svg className={`w-5 h-5 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      )}
    </div>
  );
}
