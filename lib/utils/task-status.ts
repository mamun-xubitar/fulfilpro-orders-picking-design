export type TaskState = 'completed' | 'pending' | 'overdue' | 'seriously_late';

export function daysLate(dueDate: Date): number {
  const lateMs = Date.now() - dueDate.getTime();
  if (lateMs <= 0) return 0;
  return lateMs / 86_400_000;
}

export function deriveTaskState(status: string, dueDate: Date): TaskState {
  if (status === 'COMPLETED') return 'completed';
  const late = daysLate(dueDate);
  if (late > 2) return 'seriously_late';
  if (late > 0) return 'overdue';
  return 'pending';
}

export function completionLateness(dueDate: Date, completedAt: Date): 'on_time' | 'overdue' | 'seriously_late' {
  const lateMs = completedAt.getTime() - dueDate.getTime();
  if (lateMs <= 0) return 'on_time';
  return lateMs / 86_400_000 > 2 ? 'seriously_late' : 'overdue';
}

export const TASK_STATE_LABELS: Record<TaskState, string> = {
  completed: 'Completed',
  pending: 'Pending',
  overdue: 'Overdue',
  seriously_late: 'Seriously Late',
};
