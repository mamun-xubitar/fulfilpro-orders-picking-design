import type { TaskState, TaskStateFilter } from './types';

export const TAB_FILTERS: Array<{ id: TaskStateFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'seriously_late', label: 'Seriously Late' },
  { id: 'completed', label: 'Completed' },
];

export const STATE_STYLES: Record<TaskState, { row: string; badge: string; label: string }> = {
  pending: {
    row: '',
    badge: 'bg-yellow-100 text-yellow-800',
    label: 'Pending',
  },
  overdue: {
    row: 'bg-red-50',
    badge: 'bg-red-100 text-red-700',
    label: 'Overdue',
  },
  seriously_late: {
    row: 'bg-red-100',
    badge: 'bg-red-200 text-red-900',
    label: 'Seriously Late',
  },
  completed: {
    row: 'bg-green-50',
    badge: 'bg-green-100 text-green-800',
    label: 'Completed',
  },
};

export const DEFAULT_PAGE_SIZE = 20;
