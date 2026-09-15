'use client';

import { Fragment } from 'react';
import type { RecurringTaskRow, TaskRow } from './types';
import { DUE_TYPE_STYLES } from './constants';
import { formatSchedule, summarizeAssignees } from './utils';
import { truncate } from '@/lib/utils/common';
import RecurringTaskRowActions from './RecurringTaskRowActions';
import RecurringChildRow from './RecurringChildRow';

type Props = {
  tasks: RecurringTaskRow[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  currentUserId: string;
  isAdmin: boolean;
  onEdit: (task: TaskRow) => void;
  onDelete: (taskId: string) => void;
  onComplete: (task: TaskRow) => void;
  onMessages: (task: TaskRow) => void;
  onViewProofs: (task: TaskRow) => void;
  onView: (task: TaskRow) => void;
  expandedIds: Set<string>;
  childrenByParent: Record<string, TaskRow[]>;
  childrenLoading: Record<string, boolean>;
  onToggleExpand: (task: RecurringTaskRow) => void;
  onManageAssignees: (task: RecurringTaskRow) => void;
  onStopRecurring: (task: RecurringTaskRow) => void;
  onResumeRecurring: (task: RecurringTaskRow) => void;
  onDeleteRecurring: (task: RecurringTaskRow) => void;
};

const SKELETON_ROWS = Array.from({ length: 5 });
const COLUMN_COUNT = 7;

export default function RecurringTasksTable({
  tasks, loading, total, page, pageSize, onPageChange,
  currentUserId, isAdmin, onEdit, onDelete, onComplete, onMessages, onViewProofs, onView,
  expandedIds, childrenByParent, childrenLoading, onToggleExpand, onManageAssignees, onStopRecurring, onResumeRecurring, onDeleteRecurring,
}: Props) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Task</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Assignees</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Schedule</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? SKELETON_ROWS.map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-6" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-48" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-32" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-32" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-16" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-20" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-16 ml-auto" /></td>
                  </tr>
                ))
              : tasks.length === 0
              ? (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className="px-4 py-12 text-center text-sm text-gray-400">No recurring tasks found</td>
                  </tr>
                )
              : tasks.map((task, i) => {
                  const serial = (page - 1) * pageSize + i + 1;
                  const expanded = expandedIds.has(task.id);
                  return (
                    <Fragment key={task.id}>
                      <tr className="border-b border-gray-200 last:border-0">
                        <td className="px-4 py-3 text-gray-500">{serial}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 leading-snug">{task.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{truncate(task.description, 50)}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          {truncate(summarizeAssignees(task.assignees), 60)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                          {formatSchedule(task)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${DUE_TYPE_STYLES[task.dueType].badge}`}>
                            {DUE_TYPE_STYLES[task.dueType].label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${task.stoppedAt ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                            {task.stoppedAt ? 'Stopped' : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <RecurringTaskRowActions
                            task={task}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                            expanded={expanded}
                            onToggleExpand={() => onToggleExpand(task)}
                            onManageAssignees={() => onManageAssignees(task)}
                            onStopRecurring={() => onStopRecurring(task)}
                            onResumeRecurring={() => onResumeRecurring(task)}
                            onDeleteRecurring={() => onDeleteRecurring(task)}
                          />
                        </td>
                      </tr>
                      {expanded && (
                        childrenLoading[task.id] ? (
                          <tr key={`${task.id}-loading`} className="border-b border-gray-200 bg-gray-50/60">
                            <td colSpan={COLUMN_COUNT} className="px-4 py-3 text-center text-xs text-gray-400">Loading…</td>
                          </tr>
                        ) : (
                          childrenByParent[task.id]?.map((child) => (
                            <RecurringChildRow
                              key={child.id}
                              task={child}
                              currentUserId={currentUserId}
                              isAdmin={isAdmin}
                              onEdit={onEdit}
                              onDelete={onDelete}
                              onComplete={onComplete}
                              onMessages={onMessages}
                              onViewProofs={onViewProofs}
                              onView={onView}
                            />
                          ))
                        )
                      )}
                    </Fragment>
                  );
                })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="px-3 py-1 text-xs rounded border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-default"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="px-3 py-1 text-xs rounded border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-default"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
