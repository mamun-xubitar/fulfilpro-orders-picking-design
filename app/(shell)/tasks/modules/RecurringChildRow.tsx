'use client';

import type { TaskRow } from './types';
import { DUE_TYPE_STYLES, STATE_STYLES } from './constants';
import { formatDueDate, taskRowKey } from './utils';
import { truncate } from '@/lib/utils/common';
import TaskRowActions from './TaskRowActions';

type Props = {
  task: TaskRow;
  currentUserId: string;
  isAdmin: boolean;
  onEdit: (task: TaskRow) => void;
  onDelete: (taskId: string) => void;
  onComplete: (task: TaskRow) => void;
  onMessages: (task: TaskRow) => void;
  onView: (task: TaskRow) => void;
};

export default function RecurringChildRow({
  task, currentUserId, isAdmin, onEdit, onDelete, onComplete, onMessages, onView,
}: Props) {
  const style = STATE_STYLES[task.state];
  return (
    <tr key={taskRowKey(task.id)} className={`border-b border-gray-200 last:border-0 bg-gray-50/60 ${style.row}`}>
      <td className="px-4 py-3" />
      <td className="px-4 py-3 pl-8">
        <p className="font-medium text-gray-900 leading-snug">{task.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{truncate(task.description, 50)}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-gray-800">{task.assigneeName}</p>
        <p className="text-xs text-gray-500">{task.assigneeEmail}</p>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
        {formatDueDate(task.dueDate)}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${DUE_TYPE_STYLES[task.dueType].badge}`}>
          {DUE_TYPE_STYLES[task.dueType].label}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
        {task.completedAt ? formatDueDate(task.completedAt) : '—'}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
          {style.label}
        </span>
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
          onViewProofs={() => {}}
          onView={onView}
          rowKind="recurringChild"
        />
      </td>
    </tr>
  );
}
