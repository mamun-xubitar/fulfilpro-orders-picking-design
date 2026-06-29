'use client';

import type { TaskRow } from './types';

type Props = {
  task: TaskRow;
  currentUserId: string;
  isAdmin: boolean;
  onEdit: (task: TaskRow) => void;
  onDelete: (taskId: string) => void;
  onComplete: (task: TaskRow) => void;
  onMessages: (task: TaskRow) => void;
  onViewProofs: (task: TaskRow) => void;
};

export default function TaskRowActions({ task, currentUserId, isAdmin, onEdit, onDelete, onComplete, onMessages, onViewProofs }: Props) {
  const isAssigner = task.assignerId === currentUserId;
  const isAssignee = task.assigneeId === currentUserId;
  const canComplete = task.status !== 'COMPLETED' && (isAssignee || (isAdmin && isAssigner));
  const canEditDelete = isAdmin && isAssigner;

  return (
    <div className="flex items-center justify-end gap-1.5">
      {/* Message badge */}
      <button
        onClick={() => onMessages(task)}
        title="Messages"
        className="relative p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150 cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
        </svg>
        {task.messageCount > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 ${task.unreadCount > 0 ? 'bg-red-500' : 'bg-gray-400'} text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5`}>
            {task.messageCount > 9 ? '9+' : task.messageCount}
          </span>
        )}
      </button>

      {/* Proof files button if completed */}
      {task.status === 'COMPLETED' && task.proofFiles.length > 0 && (
        <button
          onClick={() => onViewProofs(task)}
          title="View proof files"
          className="relative p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-150 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
          </svg>
          {task.proofFiles.length > 1 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 bg-gray-400 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
              {task.proofFiles.length > 9 ? '9+' : task.proofFiles.length}
            </span>
          )}
        </button>
      )}

      {canComplete && (
        <button
          onClick={() => onComplete(task)}
          title="Mark complete"
          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-150 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
          </svg>
        </button>
      )}

      {canEditDelete && (
        <>
          <button
            onClick={() => onEdit(task)}
            title="Edit"
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
