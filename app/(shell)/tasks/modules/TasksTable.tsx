'use client';

import { Fragment } from 'react';
import type { TaskRow } from './types';
import { DUE_TYPE_STYLES, STATE_STYLES } from './constants';
import { formatDueDate, taskRowKey } from './utils';
import { truncate } from '@/lib/utils/common';
import TaskRowActions from './TaskRowActions';
import RecurringChildRow from './RecurringChildRow';

type Props = {
  tasks: TaskRow[];
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
  expandable?: boolean;
  expandedIds?: Set<string>;
  childrenByParent?: Record<string, TaskRow[]>;
  childrenLoading?: Record<string, boolean>;
  onToggleExpand?: (task: TaskRow) => void;
  onStopRecurring?: (parentId: string) => void;
};

const SKELETON_ROWS = Array.from({ length: 5 });
const COLUMN_COUNT = 8;

export default function TasksTable({
  tasks, loading, total, page, pageSize, onPageChange,
  currentUserId, isAdmin, onEdit, onDelete, onComplete, onMessages, onViewProofs, onView,
  expandable = false, expandedIds, childrenByParent, childrenLoading, onToggleExpand, onStopRecurring,
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
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Assignee</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Due Date</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Completed At</th>
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
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-24" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-16" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-24" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-20" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-16 ml-auto" /></td>
                  </tr>
                ))
              : tasks.length === 0
              ? (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className="px-4 py-12 text-center text-sm text-gray-400">No tasks found</td>
                  </tr>
                )
              : tasks.map((task, i) => {
                  const style = STATE_STYLES[task.state];
                  const serial = (page - 1) * pageSize + i + 1;
                  const expanded = expandable && Boolean(expandedIds?.has(task.id));
                  return (
                    <Fragment key={taskRowKey(task.id)}>
                      <tr className={`border-b border-gray-200 last:border-0 ${expandable ? '' : style.row}`}>
                        <td className="px-4 py-3 text-gray-500">{serial}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 leading-snug">{task.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{truncate(task.description, 50)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-800">{task.assigneeName}</p>
                          <p className="text-xs text-gray-500">{task.assigneeEmail}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                          {expandable ? '—' : formatDueDate(task.dueDate)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${DUE_TYPE_STYLES[task.dueType].badge}`}>
                            {DUE_TYPE_STYLES[task.dueType].label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                          {expandable ? '—' : task.completedAt ? formatDueDate(task.completedAt) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {expandable ? (
                            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${task.recurrenceStoppedAt ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                              {task.recurrenceStoppedAt ? 'Stopped' : 'Active'}
                            </span>
                          ) : (
                            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
                              {style.label}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <TaskRowActions
                            task={task}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onComplete={onComplete}
                            onMessages={onMessages}
                            onViewProofs={onViewProofs}
                            onView={onView}
                            rowKind={expandable ? 'recurringParent' : 'normal'}
                            expanded={expanded}
                            onToggleExpand={onToggleExpand}
                            onStopRecurring={() => onStopRecurring?.(task.id)}
                          />
                        </td>
                      </tr>
                      {expandable && expanded && (
                        childrenLoading?.[task.id] ? (
                          <tr key={`${task.id}-loading`} className="border-b border-gray-200 bg-gray-50/60">
                            <td colSpan={COLUMN_COUNT} className="px-4 py-3 text-center text-xs text-gray-400">Loading…</td>
                          </tr>
                        ) : (
                          childrenByParent?.[task.id]?.map((child) => (
                            <RecurringChildRow
                              key={child.id}
                              task={child}
                              currentUserId={currentUserId}
                              isAdmin={isAdmin}
                              onEdit={onEdit}
                              onDelete={onDelete}
                              onComplete={onComplete}
                              onMessages={onMessages}
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
